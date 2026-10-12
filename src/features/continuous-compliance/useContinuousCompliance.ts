import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { ConnectorIntegration, ControlCheck, EvidenceResult } from '../../types/database.types'

export interface CheckWithEvidence {
  check: ControlCheck
  latest: EvidenceResult | null
}

interface Result {
  integration: ConnectorIntegration | null
  checks: CheckWithEvidence[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Charge l'intégration Tenable de l'org + ses checks + la dernière preuve par check (RFC 0014 P1.4). */
export function useContinuousCompliance(): Result {
  const [integration, setIntegration] = useState<ConnectorIntegration | null>(null)
  const [checks, setChecks] = useState<CheckWithEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError(null)
    const [integRes, checkRes, evRes] = await Promise.all([
      supabase.from('connector_integrations').select('*').eq('provider', 'tenable').abortSignal(signal).maybeSingle(),
      supabase.from('control_checks').select('*').eq('provider', 'tenable').order('check_key').abortSignal(signal),
      supabase.from('evidence_results').select('*').order('collected_at', { ascending: false }).abortSignal(signal),
    ])
    if (signal.aborted) return
    if (integRes.error || checkRes.error || evRes.error) {
      console.error('[continuous-compliance]', integRes.error?.message ?? checkRes.error?.message ?? evRes.error?.message)
      setError('Erreur de chargement.')
      setLoading(false)
      return
    }
    const latestByCheck = new Map<string, EvidenceResult>()
    for (const ev of (evRes.data ?? []) as EvidenceResult[]) {
      if (!latestByCheck.has(ev.check_id)) latestByCheck.set(ev.check_id, ev)
    }
    setIntegration((integRes.data as ConnectorIntegration | null) ?? null)
    setChecks(((checkRes.data ?? []) as ControlCheck[]).map((check) => ({ check, latest: latestByCheck.get(check.id) ?? null })))
    setLoading(false)
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const refetch = useCallback(() => {
    const ac = new AbortController()
    void load(ac.signal)
  }, [load])

  return { integration, checks, loading, error, refetch }
}
