import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { ControlAssessment, Control, Domain, AssessmentValidation, AssessmentFinding, FindingClassification, User } from '../../types/database.types'

export interface ReviewAssessment extends ControlAssessment {
  control: Control & { domain: Pick<Domain, 'code' | 'name'> }
  auditor: Pick<User, 'first_name' | 'last_name'>
  validations: AssessmentValidation[]
  findings: AssessmentFinding[]
  topClassification: FindingClassification | null
}

interface UseReviewAssessmentsResult {
  assessments: ReviewAssessment[]
  loading: boolean
  error: string | null
  refetch: () => void
}

const SEVERITY: Record<FindingClassification, number> = { major_nc: 4, minor_nc: 3, observation: 2, strength: 1 }

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
        setError('Impossible de charger les contrôles à revoir.')
        setLoading(false)
        return
      }

      const baseRows = (data ?? []) as unknown as Omit<ReviewAssessment, 'findings' | 'topClassification'>[]
      const ids = baseRows.map((r) => r.id)

      const findingsByAssessment = new Map<string, AssessmentFinding[]>()
      if (ids.length > 0) {
        const { data: findingsRows } = await supabase
          .from('assessment_findings')
          .select('*')
          .in('assessment_id', ids)
          .order('ord', { ascending: true })

        if (abortController.signal.aborted) return

        for (const f of (findingsRows ?? []) as AssessmentFinding[]) {
          const list = findingsByAssessment.get(f.assessment_id) ?? []
          list.push(f)
          findingsByAssessment.set(f.assessment_id, list)
        }
      }

      const rows: ReviewAssessment[] = baseRows.map((r) => {
        const fs = findingsByAssessment.get(r.id) ?? []
        const topClassification = fs.length === 0
          ? null
          : fs.reduce<FindingClassification>((acc, f) => (SEVERITY[f.classification] > SEVERITY[acc] ? f.classification : acc), fs[0].classification)
        return { ...r, findings: fs, topClassification }
      })

      setAssessments(rows)
      setLoading(false)
    }
    void load()

    return () => abortController.abort()
  }, [missionId, refreshKey])

  return { assessments, loading, error, refetch }
}
