import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { RiskTreatmentAction, RiskActionStatus } from '../../types/database.types'

export interface NewRiskAction {
  description: string
  option?: RiskTreatmentAction['option']
  control_id?: string | null
  owner_user_id?: string | null
  due_date?: string | null
}

// ---- Actions de traitement d'UN scénario (liste + CRUD) ----
export function useRiskTreatmentActions(scenarioId: string | null) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [actions, setActions] = useState<RiskTreatmentAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!scenarioId) { setActions([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_treatment_actions')
        .select('*')
        .eq('risk_scenario_id', scenarioId)
        .order('created_at', { ascending: true })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useRiskTreatmentActions]', e.message); setError('Chargement des actions impossible.'); setLoading(false); return }
      setActions((data ?? []) as unknown as RiskTreatmentAction[])
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [scenarioId, key])

  const createAction = useCallback(async (a: NewRiskAction): Promise<boolean> => {
    if (!orgId || !scenarioId) return false
    const { error: e } = await supabase.from('risk_treatment_actions').insert({
      organization_id: orgId,
      risk_scenario_id: scenarioId,
      description: a.description,
      option: a.option ?? null,
      control_id: a.control_id ?? null,
      owner_user_id: a.owner_user_id ?? null,
      due_date: a.due_date ?? null,
      created_by: profile?.id ?? null,
    } as never)
    if (e) { console.error('[createAction]', e.message); return false }
    refresh()
    return true
  }, [orgId, scenarioId, profile?.id, refresh])

  const setStatus = useCallback(async (id: string, status: RiskActionStatus): Promise<void> => {
    const { error: e } = await supabase.from('risk_treatment_actions').update({ status } as never).eq('id', id)
    if (e) { console.error('[setStatus]', e.message); return }
    refresh()
  }, [refresh])

  const deleteAction = useCallback(async (id: string): Promise<void> => {
    const { error: e } = await supabase.from('risk_treatment_actions').delete().eq('id', id)
    if (e) { console.error('[deleteAction]', e.message); return }
    refresh()
  }, [refresh])

  return { actions, loading, error, createAction, setStatus, deleteAction, refresh }
}

// ---- Plan de traitement consolidé (toutes les actions de l'org) ----
export interface PlanRow extends RiskTreatmentAction {
  scenario_title: string | null
  control_code: string | null
}

export function useRiskPlan() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [rows, setRows] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_treatment_actions')
        .select('*, scenario:risk_scenarios(title), control:controls(code)')
        .eq('organization_id', orgId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useRiskPlan]', e.message); setError('Chargement du plan impossible.'); setLoading(false); return }
      type Raw = RiskTreatmentAction & { scenario: { title: string } | null; control: { code: string } | null }
      const mapped = ((data ?? []) as unknown as Raw[]).map((r) => ({
        ...r,
        scenario_title: r.scenario?.title ?? null,
        control_code: r.control?.code ?? null,
      }))
      setRows(mapped)
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId])

  return { rows, loading, error }
}
