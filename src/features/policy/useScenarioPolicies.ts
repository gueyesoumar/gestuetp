import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { policyEvidenceStrength, POLICY_EVIDENCE_WEIGHT } from '../../lib/constants'
import type { PolicyStatus } from '../../types/database.types'

export type BarrierKind = 'preventive' | 'detective' | 'corrective'
export interface PolicyBarrier {
  linkId: string
  policy_id: string
  title: string
  status: PolicyStatus
  kind: BarrierKind
  effectiveness: number // 0..1 (forte=1, faible=0.5, nulle=0) — comme Policy-as-Evidence
}
export interface PolicyOption { id: string; title: string; status: PolicyStatus }

/** Politiques-barrières d'un scénario de risque (Policy-as-Barrier) + liaison. */
export function useScenarioPolicies(scenarioId: string): {
  barriers: PolicyBarrier[]
  loading: boolean
  search: (q: string) => Promise<PolicyOption[]>
  link: (policyId: string, kind: BarrierKind) => Promise<void>
  unlink: (linkId: string) => Promise<void>
} {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [barriers, setBarriers] = useState<PolicyBarrier[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase.from('policy_risk_links')
        .select('id, policy_id, kind, policy:policies(title, status)')
        .eq('risk_scenario_id', scenarioId).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[useScenarioPolicies]', error.message); setLoading(false); return }
      const rows = (data ?? []) as unknown as Array<{ id: string; policy_id: string; kind: BarrierKind; policy: { title: string; status: PolicyStatus } | null }>
      const ids = [...new Set(rows.map((r) => r.policy_id))]
      const applied = new Set<string>()
      if (ids.length > 0) {
        const { data: att } = await supabase.from('policy_effectiveness_attestations')
          .select('policy_id').in('policy_id', ids).eq('status', 'applied').abortSignal(ac.signal)
        if (ac.signal.aborted) return
        for (const a of (att ?? []) as Array<{ policy_id: string }>) applied.add(a.policy_id)
      }
      setBarriers(rows.map((r) => {
        const status = r.policy?.status ?? 'draft'
        const strength = policyEvidenceStrength(status, applied.has(r.policy_id))
        return { linkId: r.id, policy_id: r.policy_id, title: r.policy?.title ?? '—', status, kind: r.kind, effectiveness: POLICY_EVIDENCE_WEIGHT[strength] }
      }))
      setLoading(false)
    })()
    return () => ac.abort()
  }, [scenarioId, key])

  const search = useCallback(async (q: string): Promise<PolicyOption[]> => {
    if (!orgId || q.trim().length < 2) return []
    const { data } = await supabase.from('policies').select('id, title, status')
      .eq('organization_id', orgId).ilike('title', `%${q}%`).limit(15)
    return (data ?? []) as PolicyOption[]
  }, [orgId])

  const link = useCallback(async (policyId: string, kind: BarrierKind): Promise<void> => {
    if (!orgId) return
    const { error } = await supabase.from('policy_risk_links').insert({
      organization_id: orgId, policy_id: policyId, risk_scenario_id: scenarioId, kind,
    } as never)
    if (error) { console.error('[link policy barrier]', error.message); return }
    setKey((k) => k + 1)
  }, [orgId, scenarioId])

  const unlink = useCallback(async (linkId: string): Promise<void> => {
    const { error } = await supabase.from('policy_risk_links').delete().eq('id', linkId)
    if (error) { console.error('[unlink policy barrier]', error.message); return }
    setKey((k) => k + 1)
  }, [])

  return { barriers, loading, search, link, unlink }
}
