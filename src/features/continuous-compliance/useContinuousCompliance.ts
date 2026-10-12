import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { ConnectorIntegration, ControlCheck, EvidenceResult } from '../../types/database.types'

export interface CheckWithEvidence {
  check: ControlCheck
  latest: EvidenceResult | null
}

interface Result {
  integrations: ConnectorIntegration[]
  checks: CheckWithEvidence[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Charge tous les connecteurs de l'org + leurs checks + la dernière preuve par check (RFC 0014 P1.4/P3). */
export function useContinuousCompliance(): Result {
  const [integrations, setIntegrations] = useState<ConnectorIntegration[]>([])
  const [checks, setChecks] = useState<CheckWithEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError(null)
    const [integRes, checkRes, evRes] = await Promise.all([
      supabase.from('connector_integrations').select('*').abortSignal(signal),
      supabase.from('control_checks').select('*').order('provider').order('check_key').abortSignal(signal),
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
    setIntegrations((integRes.data ?? []) as ConnectorIntegration[])
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

  return { integrations, checks, loading, error, refetch }
}
