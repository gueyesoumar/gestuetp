import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface PortfolioOrg {
  organization_id: string
  org_name: string
  sector: string | null
  scenario_count: number
  above_threshold: number
  overdue_reviews: number
  avg_exposure: number
  max_exposure: number
  pending_directives: number
}

export interface SupervisedRisk {
  id: string
  organization_id: string
  org_name: string
  title: string
  dimension: string | null
  inherent_likelihood: number
  inherent_impact: number
  treatment: string
  lifecycle_status: string
  next_review_at: string | null
  threat_ref: string | null
  feared_event_ref: string | null
  vulnerability: string | null
  asset_name: string | null
}

/** Portefeuille de risque multi-org d'un superviseur (RFC 0017 Lot C, cross-tenant RPC). */
export function useSupervisedPortfolio() {
  const [orgs, setOrgs] = useState<PortfolioOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase.rpc('get_supervised_org_portfolio').abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useSupervisedPortfolio]', e.message); setError('Chargement du portefeuille impossible.'); setLoading(false); return }
      setOrgs((data ?? []) as PortfolioOrg[])
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [])

  return { orgs, loading, error }
}

export interface SupervisedPlanRow {
  id: string
  organization_id: string
  org_name: string
  risk_scenario_id: string
  scenario_title: string | null
  description: string
  control_code: string | null
  option: string | null
  origin: string
  due_date: string | null
  status: string
  verification_status: string
  created_at: string
}

/** Registre consolidé : risques de TOUS les assujettis supervisés (RFC 0017 Lot H). */
export function useSupervisedRegister() {
  const [rows, setRows] = useState<SupervisedRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase.rpc('get_supervised_risks', { p_org_id: null }).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useSupervisedRegister]', e.message); setError('Chargement du registre consolidé impossible.'); setLoading(false); return }
      setRows((data ?? []) as SupervisedRisk[])
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [])
  return { rows, loading, error }
}

/** Plan de traitement consolidé : actions de TOUS les assujettis supervisés (RFC 0017 Lot H). */
export function useSupervisedPlan() {
  const [rows, setRows] = useState<SupervisedPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase.rpc('get_supervised_plan').abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useSupervisedPlan]', e.message); setError('Chargement du plan consolidé impossible.'); setLoading(false); return }
      setRows((data ?? []) as SupervisedPlanRow[])
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [])
  return { rows, loading, error }
}

/** Risques détaillés d'une org supervisée, chargés à la demande (drill-down). */
export function useSupervisedRisks(orgId: string | null) {
  const [rows, setRows] = useState<SupervisedRisk[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((signal?: AbortSignal) => {
    if (!orgId) { setRows([]); return }
    setLoading(true)
    void (async () => {
      let q = supabase.rpc('get_supervised_risks', { p_org_id: orgId })
      if (signal) q = q.abortSignal(signal)
      const { data, error: e } = await q
      if (signal?.aborted) return
      if (e) { console.error('[useSupervisedRisks]', e.message); setError('Chargement des risques impossible.'); setLoading(false); return }
      setRows((data ?? []) as SupervisedRisk[])
      setError(null); setLoading(false)
    })()
  }, [orgId])

  useEffect(() => {
    const ac = new AbortController()
    load(ac.signal)
    return () => ac.abort()
  }, [load])

  return { rows, loading, error, reload: () => load() }
}
