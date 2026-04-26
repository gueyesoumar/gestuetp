import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface CabinetMission {
  id: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  client_name: string | null
  framework_name: string | null
  lead_first_name: string | null
  lead_last_name: string | null
}

interface Result {
  missions: CabinetMission[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCabinetMissionsAll(cabinetId: string | undefined): Result {
  const [missions, setMissions] = useState<CabinetMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!cabinetId) {
      setLoading(false)
      return
    }

    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void supabase
      .from('missions')
      .select('id, name, status, start_date, end_date, is_active, created_at, updated_at, client:organizations!missions_client_id_fkey(name), framework:frameworks(name), lead:users!missions_lead_auditor_id_fkey(first_name, last_name)')
      .eq('cabinet_id', cabinetId)
      .order('updated_at', { ascending: false })
      .abortSignal(abort.signal)
      .then(({ data, error: queryError }) => {
        if (abort.signal.aborted) return
        if (queryError) {
          setError('Chargement des missions impossible')
          setLoading(false)
          return
        }
        const rows = ((data ?? []) as Array<Record<string, unknown> & {
          client: { name: string } | null
          framework: { name: string } | null
          lead: { first_name: string; last_name: string } | null
        }>).map((r) => ({
          id: r.id as string,
          name: r.name as string,
          status: r.status as string,
          start_date: r.start_date as string | null,
          end_date: r.end_date as string | null,
          is_active: r.is_active as boolean,
          created_at: r.created_at as string,
          updated_at: r.updated_at as string,
          client_name: r.client?.name ?? null,
          framework_name: r.framework?.name ?? null,
          lead_first_name: r.lead?.first_name ?? null,
          lead_last_name: r.lead?.last_name ?? null,
        }))
        setMissions(rows)
        setLoading(false)
      })

    return () => abort.abort()
  }, [cabinetId, tick])

  return { missions, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
