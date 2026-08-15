import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { policyEvidenceStrength, type PolicyEvidenceStrength } from '../../lib/constants'
import type { PolicyStatus } from '../../types/database.types'

export interface EvidencePolicy {
  id: string
  title: string
  status: PolicyStatus
  strength: PolicyEvidenceStrength
}

/** Politiques liées à un contrôle, avec leur force de preuve (Policy-as-Evidence, côté Comply). */
export function useControlPolicies(controlId: string | null): { policies: EvidencePolicy[]; loading: boolean } {
  const [policies, setPolicies] = useState<EvidencePolicy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!controlId) { setPolicies([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data: links, error } = await supabase.from('policy_control_links')
        .select('policy_id, policy:policies(id, title, status)')
        .eq('control_id', controlId).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[useControlPolicies]', error.message); setLoading(false); return }
      const rows = (links ?? []) as unknown as Array<{ policy_id: string; policy: { id: string; title: string; status: PolicyStatus } | null }>
      const ids = rows.map((r) => r.policy_id)
      // Une politique est « appliquée » si elle a une attestation d'application effective.
      const applied = new Set<string>()
      if (ids.length > 0) {
        const { data: att } = await supabase.from('policy_effectiveness_attestations')
          .select('policy_id').in('policy_id', ids).eq('status', 'applied').abortSignal(ac.signal)
        if (ac.signal.aborted) return
        for (const a of (att ?? []) as Array<{ policy_id: string }>) applied.add(a.policy_id)
      }
      setPolicies(rows.filter((r) => r.policy).map((r) => ({
        id: r.policy!.id, title: r.policy!.title, status: r.policy!.status,
        strength: policyEvidenceStrength(r.policy!.status, applied.has(r.policy_id)),
      })))
      setLoading(false)
    })()
    return () => ac.abort()
  }, [controlId])

  return { policies, loading }
}
