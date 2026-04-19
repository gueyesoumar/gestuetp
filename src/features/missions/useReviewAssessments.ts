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

    supabase
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
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useReviewAssessments:', queryError.message)
          setError('Impossible de charger les contr\u00f4les \u00e0 revoir.')
        } else {
          setAssessments((data ?? []) as unknown as ReviewAssessment[])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [missionId, refreshKey])

  return { assessments, loading, error, refetch }
}
