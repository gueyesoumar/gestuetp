import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { MissionStatusEvent } from '../../types/database.types'

export interface UseMissionStatusEventsReturn {
  events: MissionStatusEvent[]
  loading: boolean
  refetch: () => Promise<void>
}

/** Journal d'événements de mission (RFC UX Lot 5) — envoi client, renvoi, décisions client. */
export function useMissionStatusEvents(missionId: string | null): UseMissionStatusEventsReturn {
  const [events, setEvents] = useState<MissionStatusEvent[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!missionId) { setEvents([]); setLoading(false); return }
    setLoading(true)
    const query = supabase
      .from('mission_status_events')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: true })
      .returns<MissionStatusEvent[]>()
    const { data, error } = await (signal ? query.abortSignal(signal) : query)
    if (signal?.aborted) return
    if (error) {
      console.error('[useMissionStatusEvents]', error.message)
      setLoading(false)
      return
    }
    setEvents(data ?? [])
    setLoading(false)
  }, [missionId])

  useEffect(() => {
    const ac = new AbortController()
    void refetch(ac.signal)
    return () => ac.abort()
  }, [refetch])

  return { events, loading, refetch: () => refetch() }
}
