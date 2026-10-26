import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { NewFindingInput } from '../findings/useAssessmentFindings'

export interface PreviousEval {
  conformityLevel: string | null
  observations: string | null
  findings: NewFindingInput[]
  missionName: string
  closedAt: string | null
}

interface Result {
  isReview: boolean
  loading: boolean
  previous: PreviousEval | null
  setDelta: (assessmentId: string, delta: 'unchanged' | 'modified') => Promise<boolean>
}

/**
 * Revue périodique (n°18 Lot 3b) : si la mission courante est la revue d'une
 * précédente (missions.review_of_mission_id), récupère l'évaluation N-1 du même
 * contrôle (cotation + constats) pour l'afficher avant de coter. Lecture bornée
 * par les RLS existantes des control_assessments. Hors revue -> isReview=false.
 */
export function useReviewBaseline(missionId: string | null, controlId: string | null): Result {
  const [isReview, setIsReview] = useState(false)
  const [previous, setPrevious] = useState<PreviousEval | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!missionId || !controlId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)

    const load = async (): Promise<void> => {
      const { data: mission, error: mErr } = await supabase
        .from('missions').select('review_of_mission_id').eq('id', missionId).abortSignal(ac.signal).maybeSingle()
      if (ac.signal.aborted) return
      const sourceId = (mission as { review_of_mission_id?: string | null } | null)?.review_of_mission_id ?? null
      if (mErr || !sourceId) { setIsReview(false); setPrevious(null); setLoading(false); return }
      setIsReview(true)

      const { data: prev, error: pErr } = await supabase
        .from('control_assessments')
        .select('id, conformity_level, observations, mission:missions!inner(name, updated_at)')
        .eq('mission_id', sourceId).eq('control_id', controlId)
        .abortSignal(ac.signal).maybeSingle()
      if (ac.signal.aborted) return
      if (pErr || !prev) { setPrevious(null); setLoading(false); return }
      const p = prev as unknown as { id: string; conformity_level: string | null; observations: string | null; mission: { name: string; updated_at: string | null } | null }

      const { data: findings } = await supabase
        .from('assessment_findings')
        .select('classification, description, risk, recommendation, priority')
        .eq('assessment_id', p.id).order('ord', { ascending: true })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return

      setPrevious({
        conformityLevel: p.conformity_level,
        observations: p.observations,
        missionName: p.mission?.name ?? 'Revue précédente',
        closedAt: p.mission?.updated_at ?? null,
        findings: ((findings ?? []) as NewFindingInput[]).map((f) => ({
          classification: f.classification, description: f.description,
          risk: f.risk ?? null, recommendation: f.recommendation ?? null, priority: f.priority ?? null,
        })),
      })
      setLoading(false)
    }
    void load()
    return () => ac.abort()
  }, [missionId, controlId])

  const setDelta = useCallback(async (assessmentId: string, delta: 'unchanged' | 'modified'): Promise<boolean> => {
    const { error } = await supabase.from('control_assessments').update({ review_delta: delta }).eq('id', assessmentId)
    if (error) { console.error('[useReviewBaseline] setDelta:', error.message); return false }
    return true
  }, [])

  return { isReview, loading, previous, setDelta }
}
