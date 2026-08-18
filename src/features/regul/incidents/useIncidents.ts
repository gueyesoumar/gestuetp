import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction'

export interface Incident {
  id: string
  entity_id: string
  mission_id: string | null
  title: string
  category: string
  severity: string
  status: string
  description: string | null
  impact: string | null
  affected_systems: string | null
  detected_at: string | null
  occurred_at: string | null
  declared_at: string
  initial_deadline: string | null
  final_deadline: string | null
  notified_initial_at: string | null
  final_report_at: string | null
}

/** Incidents du parc du régulateur (RLS régulateur+sous-arbre). */
export function useIncidents(): { incidents: Incident[]; loading: boolean; refresh: () => void } {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    supabase
      .from('incidents')
      .select('*')
      .order('declared_at', { ascending: false })
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) console.error('[useIncidents]', error.message)
        setIncidents((data ?? []) as Incident[])
        setLoading(false)
      })
    return () => ac.abort()
  }, [key])

  return { incidents, loading, refresh }
}

interface Result { ok: boolean; error?: string }

/** Actes sur les incidents via l'Edge Function declare-incident (ancrage S1). */
export function useDeclareIncident() {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (body: Record<string, unknown>): Promise<Result> => {
    setBusy(true)
    const r = await invokeEdgeFunction('declare-incident', body)
    setBusy(false)
    return { ok: r.ok, error: r.error }
  }, [])
  return {
    busy,
    declare: (b: Record<string, unknown>) => run({ action: 'declare', ...b }),
    setStatus: (incidentId: string, status: string) => run({ action: 'set-status', incident_id: incidentId, status }),
    notify: (incidentId: string, kind: 'initial' | 'final') => run({ action: 'notify', incident_id: incidentId, kind }),
  }
}
