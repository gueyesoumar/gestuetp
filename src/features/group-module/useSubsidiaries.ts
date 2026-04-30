import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface SubsidiaryRow {
  id: string
  name: string
  sector: string | null
  city: string | null
  /** Score moyen pondéré (sur missions clôturées). Null si aucune. */
  conformityScore: number | null
  activeMissions: number
  closedMissions: number
  overdueCount: number
  lastReviewDate: string | null
  nextReviewDate: string | null
  frameworkLabels: string[]
}

interface UseSubsidiariesResult {
  subsidiaries: SubsidiaryRow[]
  loading: boolean
  totalCount: number
  averageScore: number | null
  totalActiveMissions: number
  totalOverdue: number
}

interface MissionRow {
  id: string
  client_id: string | null
  status: string
  kind: string
  framework_id: string | null
}

interface CycleRow {
  mission_id: string
  status: string
  score: number | null
  closed_at: string | null
  period_start: string
  period_end: string
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

export function useSubsidiaries(): UseSubsidiariesResult {
  const { profile } = useAuth()
  const [subsidiaries, setSubsidiaries] = useState<SubsidiaryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) return
    const ac = new AbortController()
    setLoading(true)

    const load = async (): Promise<void> => {
      // 1. Filiales
      const { data: subs } = await supabase
        .from('organizations')
        .select('id, name, sector, city')
        .eq('parent_org_id', profile.organization_id)
        .order('name')
      if (ac.signal.aborted) return
      const subList = (subs ?? []) as Array<{ id: string; name: string; sector: string | null; city: string | null }>
      const subIds = subList.map((s) => s.id)
      if (subIds.length === 0) {
        setSubsidiaries([])
        setLoading(false)
        return
      }

      // 2. Toutes les missions de ces filiales (en tant que client)
      const { data: missions } = await supabase
        .from('missions')
        .select('id, client_id, status, kind, framework_id')
        .in('client_id', subIds)
      if (ac.signal.aborted) return
      const missionList = (missions ?? []) as MissionRow[]

      // 3. Frameworks pour les labels
      const fwIds = Array.from(new Set(missionList.map((m) => m.framework_id).filter(Boolean) as string[]))
      const fwMap = new Map<string, string>()
      if (fwIds.length > 0) {
        const { data: fws } = await supabase.from('frameworks').select('id, name').in('id', fwIds)
        for (const f of (fws ?? []) as Array<{ id: string; name: string }>) fwMap.set(f.id, f.name)
      }

      // 4. Assessments pour conformity_level (calcul du score moyen pondéré par filiale)
      const missionIds = missionList.map((m) => m.id)
      const { data: assessments } = (missionIds.length > 0
        ? await supabase
            .from('control_assessments')
            .select('mission_id, conformity_level')
            .in('mission_id', missionIds)
        : { data: [] as Array<{ mission_id: string; conformity_level: string | null }> }) as { data: Array<{ mission_id: string; conformity_level: string | null }> }
      if (ac.signal.aborted) return

      // 5. CAR ouvertes en retard
      const today = new Date().toISOString().slice(0, 10)
      const { data: overdueCars } = (missionIds.length > 0
        ? await supabase
            .from('corrective_action_requests')
            .select('mission_id, status, deadline, client_target_date, verification_status')
            .in('mission_id', missionIds)
            .neq('status', 'verified')
            .neq('status', 'closed')
        : { data: [] as Array<{ mission_id: string; deadline: string | null; client_target_date: string | null }> }) as { data: Array<{ mission_id: string; deadline: string | null; client_target_date: string | null }> }
      if (ac.signal.aborted) return

      // 6. Cycles de supervision pour les dates dernière/prochaine revue
      const { data: cycles } = (missionIds.length > 0
        ? await supabase
            .from('supervision_cycles')
            .select('mission_id, status, score, closed_at, period_start, period_end')
            .in('mission_id', missionIds)
        : { data: [] as CycleRow[] }) as { data: CycleRow[] }
      if (ac.signal.aborted) return

      // 7. Agrégation par filiale
      const rows: SubsidiaryRow[] = subList.map((sub) => {
        const subMissions = missionList.filter((m) => m.client_id === sub.id)
        const subMissionIds = new Set(subMissions.map((m) => m.id))

        // Score moyen pondéré (toutes missions, conformity_level)
        let scoreSum = 0
        let scoreCount = 0
        for (const a of assessments) {
          if (!subMissionIds.has(a.mission_id)) continue
          const w = weightOf(a.conformity_level)
          if (w !== null) { scoreSum += w; scoreCount += 1 }
        }
        const conformityScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null

        // Missions actives / closed
        const activeMissions = subMissions.filter((m) => m.status !== 'closure').length
        const closedMissions = subMissions.filter((m) => m.status === 'closure').length

        // Retards
        const overdueCount = overdueCars
          .filter((c) => subMissionIds.has(c.mission_id))
          .filter((c) => {
            const due = c.client_target_date ?? c.deadline
            return due !== null && due < today
          }).length

        // Dernière revue (cycle clôturé le plus récent) + prochaine (cycle planned/in_progress avec end le plus proche)
        const subCycles = cycles.filter((c) => subMissionIds.has(c.mission_id))
        const lastClosed = subCycles
          .filter((c) => c.status === 'closed' && c.closed_at)
          .sort((a, b) => (b.closed_at ?? '').localeCompare(a.closed_at ?? ''))[0]
        const nextOpen = subCycles
          .filter((c) => c.status !== 'closed')
          .sort((a, b) => a.period_end.localeCompare(b.period_end))[0]

        // Frameworks distincts
        const frameworkLabels = Array.from(
          new Set(subMissions.map((m) => m.framework_id ? fwMap.get(m.framework_id) : null).filter(Boolean) as string[])
        )

        return {
          id: sub.id,
          name: sub.name,
          sector: sub.sector,
          city: sub.city,
          conformityScore,
          activeMissions,
          closedMissions,
          overdueCount,
          lastReviewDate: lastClosed?.closed_at?.slice(0, 10) ?? null,
          nextReviewDate: nextOpen?.period_end ?? null,
          frameworkLabels,
        }
      })

      setSubsidiaries(rows)
      setLoading(false)
    }

    void load()
    return () => ac.abort()
  }, [profile?.organization_id])

  const totalCount = subsidiaries.length
  const totalActiveMissions = subsidiaries.reduce((s, x) => s + x.activeMissions, 0)
  const totalOverdue = subsidiaries.reduce((s, x) => s + x.overdueCount, 0)
  const scored = subsidiaries.filter((x) => x.conformityScore !== null)
  const averageScore = scored.length > 0
    ? Math.round(scored.reduce((s, x) => s + (x.conformityScore ?? 0), 0) / scored.length)
    : null

  return { subsidiaries, loading, totalCount, averageScore, totalActiveMissions, totalOverdue }
}
