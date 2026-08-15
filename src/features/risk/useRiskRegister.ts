import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { riskExposure } from '../../lib/constants'
import type { RiskCatalogEntry, ScoreDimension } from '../../types/database.types'

export interface ScenarioRow {
  id: string
  title: string
  description: string | null
  dimension: ScoreDimension | null
  asset_id: string | null
  asset_name: string | null
  threat_ref: string | null
  feared_event_ref: string | null
  source_ref: string | null
  vulnerability: string | null
  inherent_likelihood: number
  inherent_impact: number
  treatment: 'accept' | 'reduce' | 'transfer' | 'avoid' | 'untreated'
  treatment_status: 'open' | 'in_progress' | 'done'
  /** Exposition inhérente 0..100 (dérivée de la cotation 4×4). */
  exposure: number
}

export interface NewScenario {
  title: string
  dimension: ScoreDimension | null
  inherent_likelihood: number
  inherent_impact: number
  treatment: ScenarioRow['treatment']
  threat_ref?: string | null
  feared_event_ref?: string | null
  vulnerability?: string | null
  asset_id?: string | null
}

interface RegisterData {
  scenarios: ScenarioRow[]
  catalog: RiskCatalogEntry[]
  assets: Array<{ id: string; name: string }>
  loading: boolean
  error: string | null
  createScenario: (s: NewScenario) => Promise<boolean>
  deleteScenario: (id: string) => Promise<void>
  refresh: () => void
}

export function useRiskRegister(): RegisterData {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([])
  const [catalog, setCatalog] = useState<RiskCatalogEntry[]>([])
  const [assets, setAssets] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const [{ data: sc, error: sErr }, { data: cat }, { data: ast }] = await Promise.all([
        supabase.from('risk_scenarios')
          .select('id, title, description, dimension, asset_id, threat_ref, feared_event_ref, source_ref, vulnerability, inherent_likelihood, inherent_impact, treatment, treatment_status, asset:risk_assets(name)')
          .eq('organization_id', orgId).order('created_at', { ascending: false }).abortSignal(ac.signal),
        supabase.from('risk_catalog').select('*').order('code').abortSignal(ac.signal),
        supabase.from('risk_assets').select('id, name').eq('organization_id', orgId).order('name').abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      if (sErr) { console.error('[useRiskRegister]', sErr.message); setError('Chargement impossible.'); setLoading(false); return }
      const rows = ((sc ?? []) as unknown as Array<ScenarioRow & { asset: { name: string } | null }>).map((r) => ({
        ...r,
        asset_name: r.asset?.name ?? null,
        exposure: riskExposure(r.inherent_likelihood, r.inherent_impact),
      }))
      setScenarios(rows)
      setCatalog((cat ?? []) as RiskCatalogEntry[])
      setAssets((ast ?? []) as Array<{ id: string; name: string }>)
      setError(null)
      setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId, key])

  const createScenario = useCallback(async (s: NewScenario): Promise<boolean> => {
    if (!orgId) return false
    const { error: e } = await supabase.from('risk_scenarios').insert({
      organization_id: orgId,
      title: s.title,
      dimension: s.dimension,
      inherent_likelihood: s.inherent_likelihood,
      inherent_impact: s.inherent_impact,
      treatment: s.treatment,
      threat_ref: s.threat_ref ?? null,
      feared_event_ref: s.feared_event_ref ?? null,
      vulnerability: s.vulnerability ?? null,
      asset_id: s.asset_id ?? null,
      created_by: profile?.id ?? null,
    } as never)
    if (e) { console.error('[createScenario]', e.message); return false }
    refresh()
    return true
  }, [orgId, profile?.id, refresh])

  const deleteScenario = useCallback(async (id: string): Promise<void> => {
    const { error: e } = await supabase.from('risk_scenarios').delete().eq('id', id)
    if (e) { console.error('[deleteScenario]', e.message); return }
    refresh()
  }, [refresh])

  return { scenarios, catalog, assets, loading, error, createScenario, deleteScenario, refresh }
}
