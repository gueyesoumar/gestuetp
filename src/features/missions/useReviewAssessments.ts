import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { ControlAssessment, Control, Domain, AssessmentValidation, User } from '../../types/database.types'

export interface ReviewAssessment extends ControlAssessment {
  control: Control & { domain: Pick<Domain, 'code' | 'name'> }
  auditor: Pick<User, 'first_name' | 'last_name'>
  validations: AssessmentValidation[]
}

interface UseReviewAssessmentsResult {
  assessments: ReviewAssessment[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useReviewAssessments(missionId: string | undefined): UseReviewAssessmentsResult {
  const [assessments, setAssessments] = useState<ReviewAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    const load = async (): Promise<void> => {
      const { data, error: queryError } = await supabase
        .from('control_assessments')
        .select(`
          *,
          control:controls(*, domain:domains(code, name)),
          auditor:users!control_assessments_auditor_id_fkey(first_name, last_name),
          validations:assessment_validations(*)
        `)
        .eq('mission_id', missionId)
        .neq('status', 'draft')
        .order('created_at')
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (queryError) {
        console.error('useReviewAssessments:', queryError.message)
        setError('Impossible de charger les contr\u00f4les \u00e0 revoir.')
        setLoading(false)
        return
      }

      const rows = (data ?? []) as unknown as ReviewAssessment[]
      const ids = rows.map((r) => r.id)

      // Hydrate `findings` / `recommendations` from assessment_findings (replaces legacy textareas)
      if (ids.length > 0) {
        const { data: findingsRows } = await supabase
          .from('assessment_findings')
          .select('assessment_id, classification, description, recommendation, ord')
          .in('assessment_id', ids)
          .order('ord', { ascending: true })

        if (abortController.signal.aborted) return

        type Row = { assessment_id: string; classification: string; description: string; recommendation: string | null }
        const byAssessment = new Map<string, Row[]>()
        for (const f of (findingsRows ?? []) as Row[]) {
          const list = byAssessment.get(f.assessment_id) ?? []
          list.push(f)
          byAssessment.set(f.assessment_id, list)
        }

        const SEVERITY: Record<string, number> = { major_nc: 4, minor_nc: 3, observation: 2, strength: 1 }
        for (const r of rows) {
          const fs = byAssessment.get(r.id) ?? []
          r.findings = fs.map((f) => f.description).join('\n\n') || null
          r.recommendations = fs.filter((f) => f.recommendation).map((f, i) => `${i + 1}. ${f.recommendation}`).join('\n') || null
          r.finding_classification = fs.length === 0
            ? null
            : fs.reduce<string>((acc, f) => ((SEVERITY[f.classification] ?? 0) > (SEVERITY[acc] ?? 0) ? f.classification : acc), fs[0].classification)
        }
      }

      setAssessments(rows)
      setLoading(false)
    }
    void load()

    return () => abortController.abort()
  }, [missionId, refreshKey])

  return { assessments, loading, error, refetch }
}
