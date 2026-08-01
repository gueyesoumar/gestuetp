import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'

interface UseToggleMemberStatusResult {
  toggleStatus: (userId: string, activate: boolean) => Promise<{ ok: boolean; error?: string }>
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
 *
 * Erreurs possibles surfacées via le helper :
 *  - quota utilisateurs atteint (trigger trg_users_quota — migration 00125)
 *  - dernier admin (refus de suspend)
 *  - permission insuffisante (RLS)
 */
export function useToggleMemberStatus(onSuccess?: () => void): UseToggleMemberStatusResult {
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleStatus = useCallback(async (userId: string, activate: boolean): Promise<{ ok: boolean; error?: string }> => {
    setToggling(true)
    setError(null)

    const res = await invokeEdgeFunction('manage-member', {
      action: activate ? 'reactivate' : 'suspend',
      target_user_id: userId,
    })

    setToggling(false)

    if (!res.ok) {
      const msg = res.error ?? 'Impossible de modifier le statut du membre.'
      console.warn('useToggleMemberStatus rejected:', msg)
      setError(msg)
      return { ok: false, error: msg }
    }

    onSuccess?.()
    return { ok: true }
  }, [onSuccess])

  return { toggleStatus, toggling, error }
}
