import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ControlPlanning, ClientContact, InterviewSchedule } from '../../../types/database.types'

interface UsePlanningDataResult {
  plannings: ControlPlanning[]
  contacts: ClientContact[]
  interviews: InterviewSchedule[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePlanningData(missionId: string | undefined): UsePlanningDataResult {
  const [plannings, setPlannings] = useState<ControlPlanning[]>([])
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([])
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
      setInterviews((isRes.data ?? []) as unknown as InterviewSchedule[])
      setLoading(false)
    }

    fetchAll()
    return () => ac.abort()
  }, [missionId, refreshKey])

  return { plannings, contacts, interviews, loading, error, refetch }
}
