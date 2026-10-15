import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { RiskAcceptance } from '../../types/database.types'

export interface AcceptInput {
  residual_level: number
  justification: string | null
  valid_until: string | null
  is_derogation: boolean
}

export interface UseRiskAcceptanceResult {
  acceptance: RiskAcceptance | null   // la plus récente (active ou non)
  loading: boolean
  error: string | null
  accept: (input: AcceptInput) => Promise<{ ok: boolean; error?: string }>
  revoke: (id: string) => Promise<void>
  refresh: () => void
}

/** Acceptation du risque résiduel d'un scénario (RFC 0017 Lot 3). */
export function useRiskAcceptance(scenarioId: string | null): UseRiskAcceptanceResult {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [acceptance, setAcceptance] = useState<RiskAcceptance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!scenarioId) { setAcceptance(null); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_acceptances')
        .select('*')
        .eq('risk_scenario_id', scenarioId)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useRiskAcceptance]', e.message); setError('Chargement de l\'acceptation impossible.'); setLoading(false); return }
      const rows = (data ?? []) as unknown as RiskAcceptance[]
      setAcceptance(rows[0] ?? null)
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [scenarioId, key])

  const accept = useCallback(async (input: AcceptInput): Promise<{ ok: boolean; error?: string }> => {
    if (!orgId || !scenarioId) return { ok: false }
    const { error: e } = await supabase.from('risk_acceptances').insert({
      organization_id: orgId,
      risk_scenario_id: scenarioId,
      residual_level: input.residual_level,
      justification: input.justification,
      valid_until: input.valid_until,
      is_derogation: input.is_derogation,
      accepted_by: profile?.id ?? null,
      created_by: profile?.id ?? null,
    } as never)
    if (e) {
      console.error('[accept risk]', e.message)
      // Le message serveur du trigger de dérogation est contrôlé -> on peut le surfacer.
      return { ok: false, error: e.message }
    }
    refresh()
    return { ok: true }
  }, [orgId, scenarioId, profile?.id, refresh])

  const revoke = useCallback(async (id: string): Promise<void> => {
    const { error: e } = await supabase.from('risk_acceptances').update({ status: 'revoked' } as never).eq('id', id)
    if (e) { console.error('[revoke acceptance]', e.message); return }
    if (scenarioId) {
      await supabase.from('risk_scenarios').update({ lifecycle_status: 'reopened' } as never)
        .eq('id', scenarioId).eq('lifecycle_status', 'residual_accepted')
    }
    refresh()
  }, [scenarioId, refresh])

  return { acceptance, loading, error, accept, revoke, refresh }
}

// ---- Registre consolidé des acceptations de l'org ----
export interface AcceptanceRow extends RiskAcceptance {
  scenario_title: string | null
}

export function useRiskAcceptancesList() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [rows, setRows] = useState<AcceptanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_acceptances')
        .select('*, scenario:risk_scenarios(title)')
        .eq('organization_id', orgId)
        .order('accepted_at', { ascending: false })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useRiskAcceptancesList]', e.message); setError('Chargement impossible.'); setLoading(false); return }
      type Raw = RiskAcceptance & { scenario: { title: string } | null }
      setRows(((data ?? []) as unknown as Raw[]).map((r) => ({ ...r, scenario_title: r.scenario?.title ?? null })))
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId])

  return { rows, loading, error }
}
