import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface SupervisorDirective {
  id: string
  organization_id: string
  org_name: string
  risk_scenario_id: string
  scenario_title: string | null
  description: string
  due_date: string | null
  status: string
  verification_status: string
  created_at: string
}

/**
 * Directives de traitement émises par le régulateur courant vers les assujettis
 * (cross-tenant via RPC SECURITY DEFINER, RFC 0017 Lot 6c).
 */
export function useSupervisorDirectives() {
  const [rows, setRows] = useState<SupervisorDirective[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase.rpc('get_supervisor_directives').abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useSupervisorDirectives]', e.message); setError('Chargement des demandes impossible.'); setLoading(false); return }
      setRows((data ?? []) as unknown as SupervisorDirective[])
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [key])

  const request = useCallback(async (scenarioId: string, description: string, dueDate?: string | null): Promise<{ ok: boolean; error?: string }> => {
    const { error: e } = await supabase.rpc('request_risk_treatment', {
      p_scenario: scenarioId, p_description: description, p_due_date: dueDate ?? null,
    })
    if (e) { console.error('[request_risk_treatment]', e.message); return { ok: false, error: e.message } }
    refresh()
    return { ok: true }
  }, [refresh])

  const verify = useCallback(async (actionId: string, decision: 'verified' | 'rejected'): Promise<boolean> => {
    const { error: e } = await supabase.rpc('verify_risk_treatment', { p_action: actionId, p_decision: decision })
    if (e) { console.error('[verify_risk_treatment]', e.message); return false }
    refresh()
    return true
  }, [refresh])

  return { rows, loading, error, request, verify, refresh }
}
