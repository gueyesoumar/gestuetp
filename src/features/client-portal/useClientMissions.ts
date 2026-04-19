import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface ClientMission {
  id: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  framework_name: string | null
  cabinet_name: string | null
  cabinet_id: string
  permission: string
}

interface UseClientMissionsReturn {
  missions: ClientMission[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useClientMissions(cabinetFilter?: string): UseClientMissionsReturn {
  const [missions, setMissions] = useState<ClientMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMissions = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      setError('Non authentifi\u00e9')
      setLoading(false)
      return
    }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

    // 1. Fetch access list
    const accessRes = await fetch(`${baseUrl}/rest/v1/client_mission_access?select=mission_id,permission`, { headers })
    if (!accessRes.ok) {
      console.error('useClientMissions access:', accessRes.status)
      setError('Erreur lors du chargement des acc\u00e8s')
      setLoading(false)
      return
    }
    const accessList = await accessRes.json() as { mission_id: string; permission: string }[]

    if (accessList.length === 0) {
      setMissions([])
      setLoading(false)
      return
    }

    // 2. Fetch missions (sans join pour éviter l'erreur 300 PostgREST)
    const missionIds = accessList.map((a) => a.mission_id)
    const idsFilter = `in.(${missionIds.join(',')})`
    const missionsRes = await fetch(
      `${baseUrl}/rest/v1/missions?id=${idsFilter}&select=id,name,status,start_date,end_date,cabinet_id,framework_id`,
      { headers }
    )

    if (!missionsRes.ok) {
      console.error('useClientMissions missions:', missionsRes.status)
      setError('Erreur lors du chargement des missions')
      setLoading(false)
      return
    }

    const missionsData = await missionsRes.json() as Record<string, unknown>[]

    // 3. Fetch framework names
    const fwIds = [...new Set(missionsData.map((m) => m.framework_id as string))]
    let fwMap: Record<string, string> = {}
    if (fwIds.length > 0) {
      const fwRes = await fetch(`${baseUrl}/rest/v1/frameworks?id=in.(${fwIds.join(',')})&select=id,name`, { headers })
      if (fwRes.ok) {
        const fwData = await fwRes.json() as { id: string; name: string }[]
        fwMap = Object.fromEntries(fwData.map((f) => [f.id, f.name]))
      }
    }

    // 4. Fetch cabinet names
    const cabIds = [...new Set(missionsData.map((m) => m.cabinet_id as string))]
    let cabMap: Record<string, string> = {}
    if (cabIds.length > 0) {
      const cabRes = await fetch(`${baseUrl}/rest/v1/organizations?id=in.(${cabIds.join(',')})&select=id,name`, { headers })
      if (cabRes.ok) {
        const cabData = await cabRes.json() as { id: string; name: string }[]
        cabMap = Object.fromEntries(cabData.map((c) => [c.id, c.name]))
      }
    }

    const mapped: ClientMission[] = missionsData.map((m) => {
      const access = accessList.find((a) => a.mission_id === m.id)
      return {
        id: m.id as string,
        name: m.name as string,
        status: m.status as string,
        start_date: m.start_date as string | null,
        end_date: m.end_date as string | null,
        framework_name: fwMap[m.framework_id as string] ?? null,
        cabinet_name: cabMap[m.cabinet_id as string] ?? null,
        cabinet_id: m.cabinet_id as string,
        permission: access?.permission ?? 'viewer',
      }
    })

    const filtered = cabinetFilter
      ? mapped.filter((m) => m.cabinet_id === cabinetFilter)
      : mapped

    setMissions(filtered)
    setLoading(false)
  }, [cabinetFilter])

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  return { missions, loading, error, refetch: fetchMissions }
}
