import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Mission, Framework, Organization } from '../../types/database.types'

export interface MissionWithDetails extends Mission {
  framework: Framework
  client: Organization
  lead_auditor: { first_name: string; last_name: string } | null
  totalControls: number
  evaluatedControls: number
  approvedControls: number
  progressPct: number
  scorePct: number | null
}

interface UseMissionsResult {
  missions: MissionWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMissions(): UseMissionsResult {
  const { profile } = useAuth()
  const [missions, setMissions] = useState<MissionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('missions')
      .select(`
        *,
        framework:frameworks(*),
        client:organizations!missions_client_id_fkey(*),
        lead_auditor:users!missions_lead_auditor_id_fkey(first_name, last_name)
      `)
      .eq('cabinet_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .abortSignal(abortController.signal)
      .then(async ({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useMissions:', queryError.message)
          setError('Impossible de charger les missions.')
          setMissions([])
          setLoading(false)
          return
        }

        const missionsList = (data ?? []) as unknown as MissionWithDetails[]

        // Charger les stats par mission
        const missionIds = missionsList.map((m) => m.id)
        if (missionIds.length > 0) {
          const { data: assessments } = await supabase
            .from('control_assessments')
            .select('mission_id, status')
            .in('mission_id', missionIds)
            .abortSignal(abortController.signal)

          if (abortController.signal.aborted) return

          const statsMap = new Map<string, { total: number; evaluated: number; approved: number }>()
          for (const a of assessments ?? []) {
            const s = statsMap.get(a.mission_id) ?? { total: 0, evaluated: 0, approved: 0 }
            s.total++
            if (a.status !== 'draft') s.evaluated++
            if (a.status === 'approved') s.approved++
            statsMap.set(a.mission_id, s)
          }

          for (const m of missionsList) {
            const s = statsMap.get(m.id) ?? { total: 0, evaluated: 0, approved: 0 }
            m.totalControls = s.total
            m.evaluatedControls = s.evaluated
            m.approvedControls = s.approved
            m.progressPct = s.total > 0 ? Math.round((s.evaluated / s.total) * 100) : 0
            m.scorePct = s.total > 0 && s.evaluated > 0 ? Math.round((s.approved / s.total) * 100) : null
          }
        }

        setMissions(missionsList)
        setLoading(false)
      })

    return () => abortController.abort()
  }, [profile?.organization_id, refreshKey])

  return { missions, loading, error, refetch }
}
