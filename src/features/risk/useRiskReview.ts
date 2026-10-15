import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { RiskReview, RiskReviewDecision, RiskLifecycleStatus } from '../../types/database.types'

export interface LogReviewInput {
  decision: RiskReviewDecision
  residual_level: number | null
  inherent_level: number | null
  notes: string | null
}

// ---- Revues d'UN scénario (journal + enregistrement) ----
export function useRiskReviews(scenarioId: string | null) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [reviews, setReviews] = useState<RiskReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!scenarioId) { setReviews([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_reviews')
        .select('*')
        .eq('risk_scenario_id', scenarioId)
        .order('reviewed_at', { ascending: true })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useRiskReviews]', e.message); setError('Chargement des revues impossible.'); setLoading(false); return }
      setReviews((data ?? []) as unknown as RiskReview[])
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [scenarioId, key])

  const logReview = useCallback(async (input: LogReviewInput): Promise<boolean> => {
    if (!orgId || !scenarioId) return false
    const { error: e } = await supabase.from('risk_reviews').insert({
      organization_id: orgId,
      risk_scenario_id: scenarioId,
      reviewed_by: profile?.id ?? null,
      decision: input.decision,
      residual_level: input.residual_level,
      inherent_level: input.inherent_level,
      notes: input.notes,
    } as never)
    if (e) { console.error('[logReview]', e.message); return false }
    refresh()
    return true
  }, [orgId, scenarioId, profile?.id, refresh])

  return { reviews, loading, error, logReview, refresh }
}

// ---- Revues dues / en retard (consolidé) ----
export interface DueRow {
  id: string
  title: string
  lifecycle_status: RiskLifecycleStatus
  last_reviewed_at: string | null
  next_review_at: string | null
  overdue: boolean
}

export function useReviewsDue() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [rows, setRows] = useState<DueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_scenarios')
        .select('id, title, lifecycle_status, last_reviewed_at, next_review_at')
        .eq('organization_id', orgId)
        .neq('lifecycle_status', 'closed')
        .order('next_review_at', { ascending: true, nullsFirst: false })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useReviewsDue]', e.message); setError('Chargement impossible.'); setLoading(false); return }
      const today = new Date().toISOString().slice(0, 10)
      type Raw = { id: string; title: string; lifecycle_status: RiskLifecycleStatus; last_reviewed_at: string | null; next_review_at: string | null }
      setRows(((data ?? []) as unknown as Raw[]).map((r) => ({
        ...r,
        overdue: !!r.next_review_at && r.next_review_at < today,
      })))
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId])

  return { rows, loading, error }
}
