import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { AssessmentWithControl } from './useAuditorAssessments'

interface UseAllAssessmentsResult {
  assessments: AssessmentWithControl[]
  loading: boolean
  refetch: () => void
}

export function useAllAssessments(missionId: string | undefined): UseAllAssessmentsResult {
  const [assessments, setAssessments] = useState<AssessmentWithControl[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) { setLoading(false); return }

    const ac = new AbortController()
    setLoading(true)

    supabase
      .from('control_assessments')
      .select('*, control:controls(*, domain:domains(code, name))')
      .eq('mission_id', missionId)
      .order('created_at')
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) {
          console.error('useAllAssessments:', error.message)
        } else {
          setAssessments((data ?? []) as unknown as AssessmentWithControl[])
        }
        setLoading(false)
      })

    return () => ac.abort()
  }, [missionId, refreshKey])

  return { assessments, loading, refetch }
}
