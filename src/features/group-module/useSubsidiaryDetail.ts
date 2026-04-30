import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { SupervisionCycle } from '../../types/database.types'

export interface SubsidiaryMissionRow {
  id: string
  name: string
  status: string
  kind: 'audit' | 'continuous_supervision'
  start_date: string | null
  end_date: string | null
  framework_id: string | null
  framework_name: string | null
  conformityScore: number | null
  totalControls: number
  evaluatedControls: number
  openCarsCount: number
  overdueCarsCount: number
  leadAuditorName: string | null
  associateName: string | null
}

export interface SubsidiaryDetail {
  id: string
  name: string
  sector: string | null
  city: string | null
  country: string | null
  conformityScore: number | null
  scoreTrend: { label: string; score: number }[]
  totalActiveMissions: number
  totalEvaluatedControls: number
  totalControlsTarget: number
  openCars: number
  overdueCars: number
  nextReviewDate: string | null
  missions: SubsidiaryMissionRow[]
  cycles: SupervisionCycle[]
}

interface UseSubsidiaryDetailResult {
  data: SubsidiaryDetail | null
  loading: boolean
  error: string | null
}

function weightOf(level: string | null | undefined): number | null {
  switch (level) {
    case 'c':  return 100
    case 'lc': return 75
    case 'pc': return 50
    case 'nc': return 0
    default:   return null
  }
}

export function useSubsidiaryDetail(subsidiaryId: string | undefined): UseSubsidiaryDetailResult {
  const [data, setData] = useState<SubsidiaryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!subsidiaryId) return
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    const load = async (): Promise<void> => {
      // 1. Filiale
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, sector, city, country')
        .eq('id', subsidiaryId)
        .single()
      if (ac.signal.aborted) return
      if (orgErr || !org) {
        setError('Filiale introuvable')
        setLoading(false)
        return
      }

      // 2. Missions où cette filiale est cliente
      const { data: missions } = await supabase
        .from('missions')
        .select('id, name, status, kind, start_date, end_date, framework_id, lead_auditor_id, associate_id')
        .eq('client_id', subsidiaryId)
        .order('created_at', { ascending: false })
      if (ac.signal.aborted) return

      const missionList = (missions ?? []) as Array<{
        id: string; name: string; status: string; kind: 'audit' | 'continuous_supervision';
        start_date: string | null; end_date: string | null; framework_id: string | null;
        lead_auditor_id: string | null; associate_id: string | null;
      }>
      const missionIds = missionList.map((m) => m.id)

      // 3. Frameworks
      const fwIds = Array.from(new Set(missionList.map((m) => m.framework_id).filter(Boolean) as string[]))
      const fwMap = new Map<string, string>()
      if (fwIds.length > 0) {
        const { data: fws } = await supabase.from('frameworks').select('id, name').in('id', fwIds)
        for (const f of (fws ?? []) as Array<{ id: string; name: string }>) fwMap.set(f.id, f.name)
      }

      // 4. Auditeurs (lead + associate)
      const userIds = Array.from(new Set([
        ...missionList.map((m) => m.lead_auditor_id),
        ...missionList.map((m) => m.associate_id),
      ].filter(Boolean) as string[]))
      const userMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds)
        for (const u of (users ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; email: string }>) {
          userMap.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email)
        }
      }

      // 5. Assessments
      const { data: assessments } = (missionIds.length > 0
        ? await supabase
            .from('control_assessments')
            .select('mission_id, conformity_level, status')
            .in('mission_id', missionIds)
        : { data: [] }) as { data: Array<{ mission_id: string; conformity_level: string | null; status: string }> }
      if (ac.signal.aborted) return

      // 6. CAR
      const today = new Date().toISOString().slice(0, 10)
      const { data: cars } = (missionIds.length > 0
        ? await supabase
            .from('corrective_action_requests')
            .select('mission_id, status, deadline, client_target_date')
            .in('mission_id', missionIds)
            .neq('status', 'verified')
            .neq('status', 'closed')
        : { data: [] }) as { data: Array<{ mission_id: string; deadline: string | null; client_target_date: string | null }> }
      if (ac.signal.aborted) return

      // 7. Cycles
      const { data: cycleRows } = (missionIds.length > 0
        ? await supabase
            .from('supervision_cycles')
            .select('*')
            .in('mission_id', missionIds)
            .order('period_start', { ascending: true })
        : { data: [] }) as { data: SupervisionCycle[] }
      if (ac.signal.aborted) return

      // 8. Total controls (par mission via framework → controls count)
      const fwControlCount = new Map<string, number>()
      if (fwIds.length > 0) {
        for (const fwId of fwIds) {
          const { count } = await supabase
            .from('domains')
            .select('controls(id)', { count: 'exact', head: true })
            .eq('framework_id', fwId)
          fwControlCount.set(fwId, count ?? 0)
        }
      }

      // Agrégation par mission
      const missionRows: SubsidiaryMissionRow[] = missionList.map((m) => {
        const ma = assessments.filter((a) => a.mission_id === m.id)
        let scoreSum = 0
        let scoreCount = 0
        for (const a of ma) {
          const w = weightOf(a.conformity_level)
          if (w !== null) { scoreSum += w; scoreCount += 1 }
        }
        const conformityScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null

        const evaluatedControls = ma.filter((a) => a.status === 'submitted' || a.status === 'in_review' || a.status === 'approved').length
        const totalControls = m.framework_id ? (fwControlCount.get(m.framework_id) ?? 0) : 0

        const missionCars = cars.filter((c) => c.mission_id === m.id)
        const openCarsCount = missionCars.length
        const overdueCarsCount = missionCars.filter((c) => {
          const due = c.client_target_date ?? c.deadline
          return due !== null && due < today
        }).length

        return {
          id: m.id,
          name: m.name,
          status: m.status,
          kind: m.kind,
          start_date: m.start_date,
          end_date: m.end_date,
          framework_id: m.framework_id,
          framework_name: m.framework_id ? fwMap.get(m.framework_id) ?? null : null,
          conformityScore,
          totalControls,
          evaluatedControls,
          openCarsCount,
          overdueCarsCount,
          leadAuditorName: m.lead_auditor_id ? userMap.get(m.lead_auditor_id) ?? null : null,
          associateName: m.associate_id ? userMap.get(m.associate_id) ?? null : null,
        }
      })

      // Score global pondéré (toutes missions de la filiale)
      let globalSum = 0
      let globalCount = 0
      for (const a of assessments) {
        const w = weightOf(a.conformity_level)
        if (w !== null) { globalSum += w; globalCount += 1 }
      }
      const globalScore = globalCount > 0 ? Math.round(globalSum / globalCount) : null

      // Tendance (4 derniers cycles clos)
      const closedCycles = cycleRows
        .filter((c) => c.status === 'closed' && c.score !== null)
        .sort((a, b) => (a.closed_at ?? '').localeCompare(b.closed_at ?? ''))
      const scoreTrend = closedCycles.slice(-4).map((c) => ({ label: c.period_label, score: c.score ?? 0 }))

      const nextOpen = cycleRows
        .filter((c) => c.status !== 'closed')
        .sort((a, b) => a.period_end.localeCompare(b.period_end))[0]

      setData({
        id: org.id as string,
        name: org.name as string,
        sector: (org as { sector: string | null }).sector ?? null,
        city: (org as { city: string | null }).city ?? null,
        country: (org as { country: string | null }).country ?? null,
        conformityScore: globalScore,
        scoreTrend,
        totalActiveMissions: missionRows.filter((m) => m.status !== 'closure').length,
        totalEvaluatedControls: missionRows.reduce((s, m) => s + m.evaluatedControls, 0),
        totalControlsTarget: missionRows.reduce((s, m) => s + m.totalControls, 0),
        openCars: missionRows.reduce((s, m) => s + m.openCarsCount, 0),
        overdueCars: missionRows.reduce((s, m) => s + m.overdueCarsCount, 0),
        nextReviewDate: nextOpen?.period_end ?? null,
        missions: missionRows,
        cycles: cycleRows,
      })
      setLoading(false)
    }

    void load()
    return () => ac.abort()
  }, [subsidiaryId])

  return { data, loading, error }
}
