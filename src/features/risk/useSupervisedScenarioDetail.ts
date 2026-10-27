import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface ScenarioDetail {
  id: string
  title: string
  org_name: string
  org_is_iic: boolean
  inherent_likelihood: number
  inherent_impact: number
  treatment: string
  lifecycle_status: string
  next_review_at: string | null
  feared_label: string | null
  asset_name: string | null
  measures: string[]
}

/** Détail factuel d'un scénario supervisé pour le panneau exécutif (RPC cross-org,
 *  scope superviseur). Null tant que non chargé ou hors périmètre. */
export function useSupervisedScenarioDetail(scenarioId: string | null): { detail: ScenarioDetail | null; loading: boolean } {
  const [detail, setDetail] = useState<ScenarioDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!scenarioId) { setDetail(null); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true); setDetail(null)
    void (async () => {
      const { data, error } = await supabase.rpc('get_supervised_scenario_detail', { p_scenario: scenarioId }).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) console.error('[useSupervisedScenarioDetail]', error.message)
      const row = ((data ?? []) as ScenarioDetail[])[0] ?? null
      setDetail(row)
      setLoading(false)
    })()
    return () => ac.abort()
  }, [scenarioId])

  return { detail, loading }
}
