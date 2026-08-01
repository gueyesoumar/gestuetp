import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import type { MeasureType } from '../lib/constants'

export interface Measure {
  id: string
  entity_id: string
  mission_id: string | null
  finding_ids: string[]
  measure_type: MeasureType
  status: string
  title: string
  legal_basis: string | null
  body: string | null
  deadline: string | null
  reference: string | null
  parent_measure_id: string | null
  issued_at: string | null
  created_at: string
}

/** Mesures d'un assujetti (RLS staff régulateur). */
export function useMeasures(entityId: string | null) {
  const [measures, setMeasures] = useState<Measure[]>([])
  const [loading, setLoading] = useState(false)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!entityId) { setMeasures([]); return }
    const ac = new AbortController()
    setLoading(true)
    supabase
      .from('regulatory_measures')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) console.error('[useMeasures]', error.message)
        setMeasures((data ?? []) as Measure[])
        setLoading(false)
      })
    return () => ac.abort()
  }, [entityId, key])

  return { measures, loading, refresh }
}

interface Result { ok: boolean; error?: string }

/** Actes sur les mesures via l'Edge Function issue-measure (ancrage S1 côté backend). */
export function useIssueMeasure() {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (body: Record<string, unknown>): Promise<Result> => {
    setBusy(true)
    const r = await invokeEdgeFunction('issue-measure', body)
    setBusy(false)
    return { ok: r.ok, error: r.error }
  }, [])

  return {
    busy,
    issue: (b: Record<string, unknown>) => run({ action: 'issue', ...b }),
    escalate: (b: Record<string, unknown>) => run({ action: 'escalate', ...b }),
    setStatus: (measureId: string, status: string) => run({ action: 'set-status', measure_id: measureId, status }),
  }
}
