import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { PHASE_LABELS } from '../../missions/mission-constants'

export interface ClientMissionDetail {
  id: string
  name: string
  status: string
  status_label: string
  start_date: string | null
  end_date: string | null
  framework_name: string | null
  cabinet_name: string | null
  cabinet_id: string
}

interface UseClientMissionDetailReturn {
  mission: ClientMissionDetail | null
  permission: string | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useClientMissionDetail(missionId: string | undefined): UseClientMissionDetailReturn {
  const [mission, setMission] = useState<ClientMissionDetail | null>(null)
  const [permission, setPermission] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (): Promise<void> => {
    if (!missionId) return
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

    // Fetch mission (sans join pour éviter erreur 300)
    const missionRes = await fetch(
      `${baseUrl}/rest/v1/missions?id=eq.${missionId}&select=id,name,status,start_date,end_date,cabinet_id,framework_id`,
      { headers }
    )

    if (!missionRes.ok) {
      setError('Mission introuvable ou acc\u00e8s refus\u00e9')
      setLoading(false)
      return
    }

    const missions = await missionRes.json() as Record<string, unknown>[]
    if (!missions.length) {
      setError('Mission introuvable')
      setLoading(false)
      return
    }

    const m = missions[0]

    // Fetch framework & cabinet names
    let frameworkName: string | null = null
    let cabinetName: string | null = null

    if (m.framework_id) {
      const fwRes = await fetch(`${baseUrl}/rest/v1/frameworks?id=eq.${m.framework_id}&select=name`, { headers })
      if (fwRes.ok) {
        const fwData = await fwRes.json() as { name: string }[]
        frameworkName = fwData[0]?.name ?? null
      }
    }
    if (m.cabinet_id) {
      const cabRes = await fetch(`${baseUrl}/rest/v1/organizations?id=eq.${m.cabinet_id}&select=name`, { headers })
      if (cabRes.ok) {
        const cabData = await cabRes.json() as { name: string }[]
        cabinetName = cabData[0]?.name ?? null
      }
    }

    setMission({
      id: m.id as string,
      name: m.name as string,
      status: m.status as string,
      status_label: PHASE_LABELS[m.status as string] ?? (m.status as string),
      start_date: m.start_date as string | null,
      end_date: m.end_date as string | null,
      framework_name: frameworkName,
      cabinet_name: cabinetName,
      cabinet_id: m.cabinet_id as string,
    })

    // Fetch permission
    const accessRes = await fetch(
      `${baseUrl}/rest/v1/client_mission_access?mission_id=eq.${missionId}&select=permission&limit=1`,
      { headers }
    )
    const accessData = await accessRes.json() as { permission: string }[]
    setPermission(accessData?.[0]?.permission ?? 'viewer')

    setLoading(false)
  }, [missionId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { mission, permission, loading, error, refetch: fetchData }
}
