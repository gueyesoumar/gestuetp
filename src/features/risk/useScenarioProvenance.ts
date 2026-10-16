import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface ScenarioProvenance {
  origin_type: 'finding' | 'mission_risk' | 'mission' | 'manual'
  origin_label: string | null
  mission_id: string | null
  mission_name: string | null
}

/** Provenance d'un scénario (constat / risque de mission / mission) pour affichage. */
export function useScenarioProvenance(scenarioId: string): ScenarioProvenance | null {
  const [prov, setProv] = useState<ScenarioProvenance | null>(null)
  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      const { data, error } = await supabase.rpc('get_scenario_provenance', { p_scenario_id: scenarioId }).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[get_scenario_provenance]', error.message); return }
      const row = (data ?? [])[0] as unknown as ScenarioProvenance | undefined
      setProv(row && row.origin_type !== 'manual' ? row : null)
    })()
    return () => ac.abort()
  }, [scenarioId])
  return prov
}
