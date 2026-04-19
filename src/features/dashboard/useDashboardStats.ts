import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface DashboardStats {
  activeMissions: number
  totalClients: number
  pendingReviews: number
  clientRejections: number
  missionsByStatus: Record<string, number>
}

export interface MissionSummary {
  id: string
  name: string
  clientName: string
  status: string
  totalControls: number
  evaluatedControls: number
}

export interface ActivityItem {
  id: string
  type: 'submission' | 'approval' | 'rejection' | 'closure'
  text: string
  time: string
}

export interface ActionItem {
  id: string
  text: string
  priority: 'urgent' | 'todo' | 'planning' | 'info'
  missionName: string
}

interface UseDashboardStatsResult {
  stats: DashboardStats
  missions: MissionSummary[]
  loading: boolean
  error: string | null
}

export function useDashboardStats(): UseDashboardStatsResult {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    activeMissions: 0,
    totalClients: 0,
    pendingReviews: 0,
    clientRejections: 0,
    missionsByStatus: {},
  })
  const [missions, setMissions] = useState<MissionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)

    const fetchData = async () => {
      // 1. Missions du cabinet
      const { data: missionsData, error: mErr } = await supabase
        .from('missions')
        .select('id, name, status, client:organizations!missions_client_id_fkey(name)')
        .eq('cabinet_id', profile.organization_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (mErr) {
        console.error('useDashboardStats missions:', mErr.message)
        setError('Impossible de charger le tableau de bord.')
        setLoading(false)
        return
      }

      const missionsList = missionsData ?? []
      const activeMissions = missionsList.filter((m) => m.status !== 'closure').length
      const missionsByStatus: Record<string, number> = {}
      for (const m of missionsList) {
        missionsByStatus[m.status] = (missionsByStatus[m.status] ?? 0) + 1
      }

      // 2. Clients
      const { data: clientsData } = await supabase
        .from('cabinet_clients')
        .select('id')
        .eq('cabinet_id', profile.organization_id)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return

      // 3. Controles en attente de revue
      const missionIds = missionsList.map((m) => m.id)
      let pendingReviews = 0
      let clientRejections = 0

      if (missionIds.length > 0) {
        const { data: assessments } = await supabase
          .from('control_assessments')
          .select('status')
          .in('mission_id', missionIds)
          .abortSignal(abortController.signal)

        if (abortController.signal.aborted) return

        if (assessments) {
          pendingReviews = assessments.filter((a) => a.status === 'submitted').length
          clientRejections = assessments.filter((a) => a.status === 'rejected').length
        }
      }

      // 4. Resume des missions actives
      const activeMissionsList: MissionSummary[] = []
      for (const m of missionsList.filter((m) => m.status !== 'closure').slice(0, 5)) {
        const { data: controls } = await supabase
          .from('control_assessments')
          .select('status')
          .eq('mission_id', m.id)
          .abortSignal(abortController.signal)

        if (abortController.signal.aborted) return

        const total = controls?.length ?? 0
        const evaluated = controls?.filter((c) => c.status !== 'draft').length ?? 0
        const clientObj = m.client as unknown as { name: string } | null

        activeMissionsList.push({
          id: m.id,
          name: m.name,
          clientName: clientObj?.name ?? '',
          status: m.status,
          totalControls: total,
          evaluatedControls: evaluated,
        })
      }

      setStats({
        activeMissions,
        totalClients: clientsData?.length ?? 0,
        pendingReviews,
        clientRejections,
        missionsByStatus,
      })
      setMissions(activeMissionsList)
      setLoading(false)
    }

    fetchData()
    return () => abortController.abort()
  }, [profile?.organization_id])

  return { stats, missions, loading, error }
}
