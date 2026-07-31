import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
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
      const detail = await readInvokeError(fnError, data, 'Invitation impossible')
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
