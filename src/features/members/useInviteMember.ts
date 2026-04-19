import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { InviteMemberPayload } from './types'

interface UseInviteMemberResult {
  inviteMember: (payload: InviteMemberPayload) => Promise<boolean>
  inviting: boolean
  error: string | null
}

export function useInviteMember(onSuccess?: () => void): UseInviteMemberResult {
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inviteMember = useCallback(async (payload: InviteMemberPayload): Promise<boolean> => {
    setInviting(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('invite-member', {
      body: payload,
    })

    if (fnError) {
      // Extraire le message du body de la reponse si disponible
      let detail = fnError.message
      try {
        const context = (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context
        if (context?.json) {
          const body = await context.json()
          if (body?.error) detail = body.error
        }
      } catch {
        // pas de body json, on garde le message original
      }
      console.error('useInviteMember:', detail)
      setError(detail)
      setInviting(false)
      return false
    }

    if (data?.error) {
      setError(data.error)
      setInviting(false)
      return false
    }

    setInviting(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { inviteMember, inviting, error }
}
