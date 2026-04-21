import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface UseToggleMemberStatusResult {
  toggleStatus: (userId: string, activate: boolean) => Promise<boolean>
  toggling: boolean
  error: string | null
}

export function useToggleMemberStatus(onSuccess?: () => void): UseToggleMemberStatusResult {
  const { profile } = useAuth()
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleStatus = useCallback(async (userId: string, activate: boolean): Promise<boolean> => {
    setToggling(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('users')
      .update({ is_active: activate })
      .eq('id', userId)

    if (updateError) {
      console.error('useToggleMemberStatus:', updateError.message)
      setError('Impossible de modifier le statut du membre.')
      setToggling(false)
      return false
    }

    // Log audit event (silently fails if table doesn't exist yet)
    if (profile?.organization_id) {
      const { error: logError } = await supabase.from('member_audit_logs').insert({
        organization_id: profile.organization_id,
        target_user_id: userId,
        performed_by: profile.id,
        action: activate ? 'reactivated' : 'deactivated',
      })
      if (logError) console.warn('audit log:', logError.message)
    }

    setToggling(false)
    onSuccess?.()
    return true
  }, [onSuccess, profile?.organization_id, profile?.id])

  return { toggleStatus, toggling, error }
}
