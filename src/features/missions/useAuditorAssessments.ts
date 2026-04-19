import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { ControlAssessment, Control, Domain } from '../../types/database.types'

export interface AssessmentWithControl extends ControlAssessment {
  control: Control & { domain: Pick<Domain, 'code' | 'name'> }
}

interface UseAuditorAssessmentsResult {
  assessments: AssessmentWithControl[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAuditorAssessments(missionId: string | undefined): UseAuditorAssessmentsResult {
  const { profile } = useAuth()
  const [assessments, setAssessments] = useState<AssessmentWithControl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId || !profile) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('control_assessments')
      .select('*, control:controls(*, domain:domains(code, name))')
      .eq('mission_id', missionId)
      .eq('auditor_id', profile.id)
      .order('created_at')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useAuditorAssessments:', queryError.message)
          setError('Impossible de charger les travaux.')
        } else {
          setAssessments((data ?? []) as unknown as AssessmentWithControl[])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [missionId, profile, refreshKey])

  return { assessments, loading, error, refetch }
}
