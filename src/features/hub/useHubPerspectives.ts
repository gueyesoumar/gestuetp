import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { RelationshipNature } from '../../types/database.types'

// Dérive les perspectives du Hub à partir du GRAPHE (arêtes sortantes actives de
// l'org courante) et calcule un score de conformité par cible. Trust Score v1 =
// conformité seule (approved / total) — les autres dimensions viendront des
// modules Risk/Awareness/incidents (dégradation gracieuse côté cockpit).

export type HubPerspective = 'self' | 'clients' | 'group' | 'assujettis'

export interface TrustTileData {
  orgId: string
  name: string
  score: number | null
  nature: RelationshipNature
}

export interface HubData {
  loading: boolean
  perspectives: HubPerspective[]
  clients: TrustTileData[]
  subsidiaries: TrustTileData[]
  assujettis: TrustTileData[]
}

const NATURE_TO_PERSPECTIVE: Partial<Record<RelationshipNature, HubPerspective>> = {
  audit_engagement: 'clients',
  group_ownership: 'group',
  regulatory_supervision: 'assujettis',
}

const EMPTY: HubData = { loading: false, perspectives: ['self'], clients: [], subsidiaries: [], assujettis: [] }

async function fetchNames(ids: string[], signal: AbortSignal): Promise<Map<string, string>> {
  const { data } = await supabase.from('organizations').select('id, name').in('id', ids).abortSignal(signal)
  const m = new Map<string, string>()
  for (const o of (data ?? []) as Array<{ id: string; name: string }>) m.set(o.id, o.name)
  return m
}

async function fetchConformity(ids: string[], signal: AbortSignal): Promise<Map<string, number>> {
  const { data: missions } = await supabase.from('missions').select('id, client_id').in('client_id', ids).abortSignal(signal)
  const missionClient = new Map<string, string>()
  for (const m of (missions ?? []) as Array<{ id: string; client_id: string | null }>) {
    if (m.client_id) missionClient.set(m.id, m.client_id)
  }
  if (missionClient.size === 0) return new Map()
  const { data: asmts } = await supabase
    .from('control_assessments').select('mission_id, status')
    .in('mission_id', [...missionClient.keys()]).abortSignal(signal)
  const agg = new Map<string, { total: number; approved: number }>()
  for (const a of (asmts ?? []) as Array<{ mission_id: string; status: string }>) {
    const client = missionClient.get(a.mission_id)
    if (!client) continue
    const cur = agg.get(client) ?? { total: 0, approved: 0 }
    cur.total += 1
    if (a.status === 'approved') cur.approved += 1
    agg.set(client, cur)
  }
  const out = new Map<string, number>()
  agg.forEach((v, client) => out.set(client, v.total > 0 ? Math.round((v.approved / v.total) * 100) : 0))
  return out
}

export function useHubPerspectives(): HubData {
  const { profile } = useAuth()
  const [data, setData] = useState<HubData>({ ...EMPTY, loading: true })

  useEffect(() => {
    const orgId = profile?.organization_id
    if (!orgId) { setData(EMPTY); return }
    const ctrl = new AbortController()

    void (async () => {
      const { data: edges, error } = await supabase
        .from('organization_relationships').select('target_org_id, nature')
        .eq('actor_org_id', orgId).eq('status', 'active').abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (error) { console.error('hub graph:', error.message); setData(EMPTY); return }

      const rows = (edges ?? []) as Array<{ target_org_id: string; nature: RelationshipNature }>
      const byNature = new Map<RelationshipNature, string[]>()
      for (const r of rows) {
        if (r.target_org_id === orgId) continue
        byNature.set(r.nature, [...(byNature.get(r.nature) ?? []), r.target_org_id])
      }
      const perspectives: HubPerspective[] = ['self']
      for (const nat of byNature.keys()) {
        const p = NATURE_TO_PERSPECTIVE[nat]
        if (p && !perspectives.includes(p)) perspectives.push(p)
      }
      const targets = [...new Set(rows.map((r) => r.target_org_id).filter((id) => id !== orgId))]
      if (targets.length === 0) { setData({ ...EMPTY, perspectives }); return }

      const [names, conformity] = await Promise.all([
        fetchNames(targets, ctrl.signal),
        fetchConformity(targets, ctrl.signal),
      ])
      if (ctrl.signal.aborted) return

      const tiles = (nature: RelationshipNature): TrustTileData[] =>
        (byNature.get(nature) ?? []).map((id) => ({
          orgId: id, name: names.get(id) ?? 'Organisation', score: conformity.get(id) ?? null, nature,
        }))

      setData({ loading: false, perspectives, clients: tiles('audit_engagement'), subsidiaries: tiles('group_ownership'), assujettis: tiles('regulatory_supervision') })
    })()

    return () => ctrl.abort()
  }, [profile?.organization_id])

  return data
}
