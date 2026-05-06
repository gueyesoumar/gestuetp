import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ControlPlanning, ClientContact, InterviewSchedule } from '../../../types/database.types'

// Apres phase C : un entretien est associe a N sujets et N acteurs (M:N).
// Les liens sont prechargues ici pour eviter des fetches granulaires en UI.
export interface InterviewWithRelations extends InterviewSchedule {
  topic_ids: string[]
  actor_ids: string[]
}

interface UsePlanningDataResult {
  plannings: ControlPlanning[]
  contacts: ClientContact[]
  interviews: InterviewWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePlanningData(missionId: string | undefined): UsePlanningDataResult {
  const [plannings, setPlannings] = useState<ControlPlanning[]>([])
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [interviews, setInterviews] = useState<InterviewWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) { setLoading(false); return }

    const ac = new AbortController()
    setLoading(true)
    setError(null)

    const fetchAll = async () => {
      const [cpRes, ccRes, isRes] = await Promise.all([
        supabase.from('control_planning').select('*').eq('mission_id', missionId).abortSignal(ac.signal),
        supabase.from('client_contacts').select('*').eq('mission_id', missionId).order('is_primary', { ascending: false }).abortSignal(ac.signal),
        supabase.from('interview_schedules').select('*').eq('mission_id', missionId).order('scheduled_date').order('scheduled_time').abortSignal(ac.signal),
      ])

      if (ac.signal.aborted) return

      if (cpRes.error) { console.error('usePlanningData cp:', cpRes.error.message) }
      if (ccRes.error) { console.error('usePlanningData cc:', ccRes.error.message) }
      if (isRes.error) { console.error('usePlanningData is:', isRes.error.message) }

      if (cpRes.error && ccRes.error && isRes.error) {
        setError('Impossible de charger les donn\u00e9es de planification.')
        setLoading(false)
        return
      }

      setPlannings((cpRes.data ?? []) as unknown as ControlPlanning[])
      setContacts((ccRes.data ?? []) as unknown as ClientContact[])

      const baseInterviews = (isRes.data ?? []) as unknown as InterviewSchedule[]

      // Charger les liens M:N (topics, actors) si on a au moins un entretien
      if (baseInterviews.length === 0) {
        setInterviews([])
        setLoading(false)
        return
      }

      const interviewIds = baseInterviews.map((i) => i.id)
      const [topicsRes, actorsRes] = await Promise.all([
        supabase.from('interview_topics').select('interview_id, topic_id').in('interview_id', interviewIds).abortSignal(ac.signal),
        supabase.from('interview_actors').select('interview_id, actor_id').in('interview_id', interviewIds).abortSignal(ac.signal),
      ])

      if (ac.signal.aborted) return

      const topicsByInterview = new Map<string, string[]>()
      for (const row of (topicsRes.data ?? []) as Array<{ interview_id: string; topic_id: string }>) {
        const list = topicsByInterview.get(row.interview_id) ?? []
        list.push(row.topic_id)
        topicsByInterview.set(row.interview_id, list)
      }

      const actorsByInterview = new Map<string, string[]>()
      for (const row of (actorsRes.data ?? []) as Array<{ interview_id: string; actor_id: string }>) {
        const list = actorsByInterview.get(row.interview_id) ?? []
        list.push(row.actor_id)
        actorsByInterview.set(row.interview_id, list)
      }

      setInterviews(baseInterviews.map((i) => ({
        ...i,
        topic_ids: topicsByInterview.get(i.id) ?? [],
        actor_ids: actorsByInterview.get(i.id) ?? [],
      })))
      setLoading(false)
    }

    fetchAll()
    return () => ac.abort()
  }, [missionId, refreshKey])

  return { plannings, contacts, interviews, loading, error, refetch }
}
