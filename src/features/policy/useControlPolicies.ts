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

/** Politiques liées à un contrôle avec leur force de preuve (Policy-as-Evidence).
 *  Passe par la fonction SECURITY DEFINER get_control_policies : voit MON org
 *  (auto-audit) OU l'org auditée quand je suis l'auditeur d'une mission (cross-tenant
 *  confiné, secure by default). */
export function useControlPolicies(controlId: string | null): { policies: EvidencePolicy[]; loading: boolean } {
  const [policies, setPolicies] = useState<EvidencePolicy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!controlId) { setPolicies([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    supabase.rpc('get_control_policies', { p_control_id: controlId }).abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) { console.error('[useControlPolicies]', error.message); setLoading(false); return }
        const rows = (data ?? []) as Array<{ policy_id: string; title: string; status: string; applied: boolean }>
        setPolicies(rows.map((r) => ({
          id: r.policy_id, title: r.title, status: r.status as PolicyStatus,
          strength: policyEvidenceStrength(r.status, r.applied),
        })))
        setLoading(false)
      })
    return () => ac.abort()
  }, [controlId])

  return { policies, loading }
}
