import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { AssessmentObservation, ObservationResponseAction } from '../../../types/database.types'

export interface ObservationWithAuthor extends AssessmentObservation {
  authorName: string | null
  responderName: string | null
}

interface UseAssessmentObservationsReturn {
  observations: ObservationWithAuthor[]
  loading: boolean
  error: string | null
  submitObservation: (assessmentId: string, text: string) => Promise<boolean>
  submitResponse: (observationId: string, responseText: string, action: ObservationResponseAction) => Promise<boolean>
  pendingCount: number
  respondedCount: number
  submitting: boolean
  refetch: () => void
}

/**
 * Loads all observations visible to the current user.
 * - Client sees observations on their missions
 * - Auditor sees observations on their cabinet's missions
 *
 * If missionId is provided, filters to that mission only.
 */
export function useAssessmentObservations(missionId?: string): UseAssessmentObservationsReturn {
  const { profile } = useAuth()
  const [observations, setObservations] = useState<ObservationWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchData = async (): Promise<void> => {
      // Build query
      let query = supabase
        .from('assessment_observations')
        .select(`
          *,
          assessment:control_assessments!inner(mission_id)
        `)
        .order('observation_at', { ascending: false })

      if (missionId) {
        query = query.eq('assessment.mission_id', missionId)
      }

      const { data, error: err } = await query.abortSignal(controller.signal)

      if (controller.signal.aborted) return
      if (err) {
        console.error('useAssessmentObservations:', err.message)
        setError('Impossible de charger les observations.')
        setLoading(false)
        return
      }

      const rows = (data ?? []) as (AssessmentObservation & { assessment: { mission_id: string } })[]

      // Fetch author/responder names
      const userIds = new Set<string>()
      for (const r of rows) {
        userIds.add(r.observation_by)
        if (r.response_by) userIds.add(r.response_by)
      }

      const userMap = new Map<string, string>()
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', [...userIds])
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        for (const u of users ?? []) {
          userMap.set(u.id, `${u.first_name} ${u.last_name}`)
        }
      }

      setObservations(rows.map((r) => ({
        ...r,
        authorName: userMap.get(r.observation_by) ?? null,
        responderName: r.response_by ? userMap.get(r.response_by) ?? null : null,
      })))
      setLoading(false)
    }

    fetchData()
    return () => controller.abort()
  }, [profile?.id, missionId, refreshKey])

  const submitObservation = useCallback(async (assessmentId: string, text: string): Promise<boolean> => {
    if (!profile?.id) return false
    setSubmitting(true)
    const { error: err } = await supabase
      .from('assessment_observations')
      .insert({
        assessment_id: assessmentId,
        observation_text: text,
        observation_by: profile.id,
      } as never)

    setSubmitting(false)
    if (err) {
      console.error('submitObservation:', err.message)
      return false
    }
    refetch()
    return true
  }, [profile?.id, refetch])

  const submitResponse = useCallback(async (observationId: string, responseText: string, action: ObservationResponseAction): Promise<boolean> => {
    if (!profile?.id) return false
    setSubmitting(true)
    const { error: err } = await supabase
      .from('assessment_observations')
      .update({
        response_text: responseText,
        response_action: action,
        response_by: profile.id,
        response_at: new Date().toISOString(),
      } as never)
      .eq('id', observationId)

    setSubmitting(false)
    if (err) {
      console.error('submitResponse:', err.message)
      return false
    }
    refetch()
    return true
  }, [profile?.id, refetch])

  const pendingCount = observations.filter((o) => o.response_text === null).length
  const respondedCount = observations.filter((o) => o.response_text !== null).length

  return { observations, loading, error, submitObservation, submitResponse, pendingCount, respondedCount, submitting, refetch }
}
