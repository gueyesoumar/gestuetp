import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface DashboardStats {
  activeMissions: number
  totalClients: number
  pendingReviews: number
  approvedCount: number
  clientRejections: number
  missionsByStatus: Record<string, number>
  averageScore: number
  totalDocuments: number
}

export interface MissionSummary {
  id: string
  name: string
  clientName: string
  clientSector: string
  status: string
  totalControls: number
  evaluatedControls: number
  endDate: string | null
  updatedAt: string
}

export interface NearestDeadline {
  missionName: string
  clientName: string
  daysRemaining: number
  endDate: string
}

export interface PriorityMission {
  id: string
  name: string
  clientName: string
  reason: string
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
  nearestDeadline: NearestDeadline | null
  priorityMission: PriorityMission | null
  loading: boolean
  error: string | null
}

export function useDashboardStats(): UseDashboardStatsResult {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    activeMissions: 0,
    totalClients: 0,
    pendingReviews: 0,
    approvedCount: 0,
    clientRejections: 0,
    missionsByStatus: {},
    averageScore: 0,
    totalDocuments: 0,
  })
  const [missions, setMissions] = useState<MissionSummary[]>([])
  const [nearestDeadline, setNearestDeadline] = useState<NearestDeadline | null>(null)
  const [priorityMission, setPriorityMission] = useState<PriorityMission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)

    const fetchData = async (): Promise<void> => {
      // 1. Missions du cabinet
      const { data: missionsData, error: mErr } = await supabase
        .from('missions')
        .select('id, name, status, start_date, end_date, updated_at, client:organizations!missions_client_id_fkey(name, sector)')
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
      let approvedCount = 0
      let clientRejections = 0
      const rejectionsByMission: Record<string, number> = {}

      if (missionIds.length > 0) {
        const { data: assessments } = await supabase
          .from('control_assessments')
          .select('status, mission_id')
          .in('mission_id', missionIds)
          .abortSignal(abortController.signal)

        if (abortController.signal.aborted) return

        if (assessments) {
          pendingReviews = assessments.filter((a) => a.status === 'submitted').length
          approvedCount = assessments.filter((a) => a.status === 'approved').length
          clientRejections = assessments.filter((a) => a.status === 'rejected').length
          for (const a of assessments.filter((a) => a.status === 'rejected')) {
            rejectionsByMission[a.mission_id] = (rejectionsByMission[a.mission_id] ?? 0) + 1
          }
        }
      }

      // 4. Documents count
      let totalDocuments = 0
      if (missionIds.length > 0) {
        const { count } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .in('mission_id', missionIds)
          .abortSignal(abortController.signal)

        if (abortController.signal.aborted) return
        totalDocuments = count ?? 0
      }

      // 5. Resume des missions actives
      const activeMissionsList: MissionSummary[] = []
      for (const m of missionsList.filter((m) => m.status !== 'closure').slice(0, 8)) {
        const { data: controls } = await supabase
          .from('control_assessments')
          .select('status')
          .eq('mission_id', m.id)
          .abortSignal(abortController.signal)

        if (abortController.signal.aborted) return

        const total = controls?.length ?? 0
        const evaluated = controls?.filter((c) => c.status !== 'draft').length ?? 0
        const clientObj = m.client as unknown as { name: string; sector: string | null } | null

        activeMissionsList.push({
          id: m.id,
          name: m.name,
          clientName: clientObj?.name ?? '',
          clientSector: clientObj?.sector ?? '',
          status: m.status,
          totalControls: total,
          evaluatedControls: evaluated,
          endDate: m.end_date,
          updatedAt: m.updated_at,
        })
      }

      // 6. Average score
      const totalControlsSum = activeMissionsList.reduce((s, m) => s + m.totalControls, 0)
      const evaluatedSum = activeMissionsList.reduce((s, m) => s + m.evaluatedControls, 0)
      const averageScore = totalControlsSum > 0 ? Math.round((evaluatedSum / totalControlsSum) * 100) : 0

      // 7. Nearest deadline
      const now = new Date()
      let nearest: NearestDeadline | null = null
      for (const m of activeMissionsList) {
        if (!m.endDate) continue
        const end = new Date(m.endDate)
        const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (days < 0) continue
        if (!nearest || days < nearest.daysRemaining) {
          nearest = {
            missionName: m.name,
            clientName: m.clientName,
            daysRemaining: days,
            endDate: m.endDate,
          }
        }
      }

      // 8. Priority mission (most rejections or lowest progress)
      let priority: PriorityMission | null = null
      const missionWithMostRejections = activeMissionsList
        .filter((m) => (rejectionsByMission[m.id] ?? 0) > 0)
        .sort((a, b) => (rejectionsByMission[b.id] ?? 0) - (rejectionsByMission[a.id] ?? 0))[0]

      if (missionWithMostRejections) {
        const count = rejectionsByMission[missionWithMostRejections.id] ?? 0
        priority = {
          id: missionWithMostRejections.id,
          name: missionWithMostRejections.name,
          clientName: missionWithMostRejections.clientName,
          reason: `${count} rejet${count > 1 ? 's' : ''} client`,
        }
      } else {
        const lowestProgress = activeMissionsList
          .filter((m) => m.totalControls > 0)
          .sort((a, b) => {
            const pctA = a.evaluatedControls / a.totalControls
            const pctB = b.evaluatedControls / b.totalControls
            return pctA - pctB
          })[0]

        if (lowestProgress) {
          const pct = Math.round((lowestProgress.evaluatedControls / lowestProgress.totalControls) * 100)
          priority = {
            id: lowestProgress.id,
            name: lowestProgress.name,
            clientName: lowestProgress.clientName,
            reason: `Progression ${pct}%`,
          }
        }
      }

      setStats({
        activeMissions,
        totalClients: clientsData?.length ?? 0,
        pendingReviews,
        approvedCount,
        clientRejections,
        missionsByStatus,
        averageScore,
        totalDocuments,
      })
      setMissions(activeMissionsList)
      setNearestDeadline(nearest)
      setPriorityMission(priority)
      setLoading(false)
    }

    fetchData()
    return () => abortController.abort()
  }, [profile?.organization_id])

  return { stats, missions, nearestDeadline, priorityMission, loading, error }
}
