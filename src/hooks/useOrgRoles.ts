import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface OrgGraphRoles {
  /** ≥1 arête sortante `group_ownership` active (je possède des filiales). */
  graphIsGroup: boolean
  /** ≥1 arête sortante `audit_engagement` active (j'audite quelqu'un). */
  graphIsCabinet: boolean
  /** ≥1 arête entrante `audit_engagement` active (je suis audité). */
  graphIsClient: boolean
  /** ≥1 arête entrante `group_ownership` active (je suis une filiale). */
  graphIsSubsidiary: boolean
  loading: boolean
}

const EMPTY = { graphIsGroup: false, graphIsCabinet: false, graphIsClient: false, graphIsSubsidiary: false }

/**
 * Rôles d'une organisation dérivés du GRAPHE de relations (RFC 0007, P0).
 *
 * Lit les arêtes actives entrantes ET sortantes du nœud (même modèle que
 * `useHubPerspectives`). Les consommateurs combinent ces signaux avec le legacy
 * `types[]` / `parent_org_id` (repli → aucune régression) tant que le graphe
 * n'est pas la source unique. La RLS `org_rel_select_own` autorise la lecture
 * des arêtes où l'org est acteur OU cible.
 */
export function useOrgRoles(orgId: string | null | undefined): OrgGraphRoles {
  const [roles, setRoles] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setRoles(EMPTY); setLoading(false); return }
    const ctrl = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('organization_relationships')
        .select('actor_org_id, target_org_id, nature')
        .or(`actor_org_id.eq.${orgId},target_org_id.eq.${orgId}`)
        .eq('status', 'active')
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (error) {
        console.error('useOrgRoles:', error.message)
        setRoles(EMPTY)
        setLoading(false)
        return
      }
      const rows = data ?? []
      const outgoing = rows.filter((r) => r.actor_org_id === orgId)
      const incoming = rows.filter((r) => r.target_org_id === orgId)
      setRoles({
        graphIsGroup: outgoing.some((r) => r.nature === 'group_ownership'),
        graphIsCabinet: outgoing.some((r) => r.nature === 'audit_engagement'),
        graphIsClient: incoming.some((r) => r.nature === 'audit_engagement'),
        graphIsSubsidiary: incoming.some((r) => r.nature === 'group_ownership'),
      })
      setLoading(false)
    })()
    return () => ctrl.abort()
  }, [orgId])

  return { ...roles, loading }
}
