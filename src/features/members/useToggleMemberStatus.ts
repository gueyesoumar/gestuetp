import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

interface UseToggleMemberStatusResult {
  toggleStatus: (userId: string, activate: boolean) => Promise<boolean>
  toggling: boolean
  error: string | null
}

/**
 * Suspend ou réactive un membre du cabinet via l'edge function manage-member.
 *
 * NOTE: avant migration 00082+00083, cette fonction faisait un UPDATE direct
 * sur public.users, qui était bloqué silencieusement par la RLS users_update_self
 * (auth_id = auth.uid()) → l'opération paraissait réussir mais ne faisait rien.
 * On passe désormais par une edge function qui vérifie can_manage_members
 * + protection anti-bricking (refus si on suspend le dernier admin du cabinet).
 */
export function useToggleMemberStatus(onSuccess?: () => void): UseToggleMemberStatusResult {
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleStatus = useCallback(async (userId: string, activate: boolean): Promise<boolean> => {
    setToggling(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('manage-member', {
      body: {
        action: activate ? 'reactivate' : 'suspend',
        target_user_id: userId,
      },
    })

    setToggling(false)

    if (fnError) {
      console.error('useToggleMemberStatus invoke:', fnError.message)
      setError('Impossible de modifier le statut du membre.')
      return false
    }
    if (data?.error) {
      console.warn('useToggleMemberStatus rejected:', data.error)
      setError(data.error)
      return false
    }

    onSuccess?.()
    return true
  }, [onSuccess])

  return { toggleStatus, toggling, error }
}
