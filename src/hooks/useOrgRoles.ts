import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Rôle « groupe » dérivé du GRAPHE de relations (RFC 0007, P0.1).
 *
 * Une organisation est un groupe si elle possède au moins une arête sortante
 * `group_ownership` active (même lecture que le Hub, `useHubPerspectives`). Les
 * consommateurs combinent ce signal avec le legacy `types[]` (repli, donc aucune
 * régression) tant que le graphe n'est pas pleinement maintenu — voir P0.2
 * (trigger `audit_engagement`, re-parentage) avant d'y dériver `isCabinet`/`isClient`.
 */
export function useOrgRoles(orgId: string | null | undefined): { graphIsGroup: boolean; loading: boolean } {
  const [graphIsGroup, setGraphIsGroup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setGraphIsGroup(false); setLoading(false); return }
    const ctrl = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('organization_relationships')
        .select('id')
        .eq('actor_org_id', orgId)
        .eq('nature', 'group_ownership')
        .eq('status', 'active')
        .limit(1)
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (error) {
        console.error('useOrgRoles:', error.message)
        setGraphIsGroup(false)
        setLoading(false)
        return
      }
      setGraphIsGroup((data ?? []).length > 0)
      setLoading(false)
    })()
    return () => ctrl.abort()
  }, [orgId])

  return { graphIsGroup, loading }
}
