import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

/**
 * Détecte si l'utilisateur courant est Associé d'au moins une mission de son cabinet.
 * Utilisé pour gater les paramètres niveau cabinet (renommage workflow, etc.).
 *
 * Les platform_owners Gëstu sont aussi traités comme autorisés (back-door admin).
 */
export function useIsOrgAssociate(): { isAssociate: boolean; loading: boolean } {
  const { profile } = useAuth()
  const [state, setState] = useState({ isAssociate: false, loading: true })

  useEffect(() => {
    if (!profile?.id || !profile.organization_id) {
      setState({ isAssociate: false, loading: false })
      return
    }
    if (profile.is_platform_owner) {
      setState({ isAssociate: true, loading: false })
      return
    }

    const abort = new AbortController()
    void (async () => {
      const { count } = await supabase
        .from('mission_members')
        .select('mission_id, missions!inner(cabinet_id)', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('role', 'associate')
        .eq('missions.cabinet_id', profile.organization_id)
        .abortSignal(abort.signal)
      if (abort.signal.aborted) return
      setState({ isAssociate: (count ?? 0) > 0, loading: false })
    })()
    return () => abort.abort()
  }, [profile?.id, profile?.organization_id, profile?.is_platform_owner])

  return state
}
