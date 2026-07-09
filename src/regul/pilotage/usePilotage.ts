import { useMemo } from 'react'
import { useSubsidiaries } from '../../features/group-module/useSubsidiaries'
import { useParkMeasures } from '../useParkMeasures'
import { MEASURE_TYPE_ORDER, type MeasureType } from '../../lib/constants'

const OPEN_MEASURE = (status: string): boolean => !['resolved', 'closed'].includes(status)
const SOON_DAYS = 30

export interface RiskItem { id: string; name: string; criticality: string; score: number | null }
export interface Priority { id: string; name: string; reason: string; severity: 'high' | 'medium' }
export interface TypeStat { type: MeasureType; total: number; open: number }

export interface PilotageData {
  loading: boolean
  posture: { total: number; oiv: number; avgScore: number | null; activeMissions: number; openMeasures: number; overdue: number }
  riskItems: RiskItem[]
  measuresByType: TypeStat[]
  deadlines: { soon: number; overdue: number }
  priorities: Priority[]
}

/** Agrège le parc (posture, risques, mesures, priorisation) — M8, lecture seule. */
export function usePilotage(): PilotageData {
  const { subsidiaries, loading: sLoading, averageScore, totalActiveMissions, totalOverdue, totalCount } = useSubsidiaries()
  const { measures, loading: mLoading } = useParkMeasures()

  return useMemo(() => {
    const now = new Date()
    const soonLimit = new Date(now.getTime() + SOON_DAYS * 86400000)
    const open = measures.filter((m) => OPEN_MEASURE(m.status))

    const measuresByType: TypeStat[] = MEASURE_TYPE_ORDER.map((type) => ({
      type,
      total: measures.filter((m) => m.measure_type === type).length,
      open: open.filter((m) => m.measure_type === type).length,
    }))

    let soon = 0, overdueM = 0
    for (const m of open) {
      if (!m.deadline) continue
      const d = new Date(m.deadline)
      if (d < now) overdueM++
      else if (d <= soonLimit) soon++
    }

    const riskItems: RiskItem[] = subsidiaries.map((s) => ({
      id: s.id, name: s.name,
      criticality: s.regulatoryProfile?.criticality ?? 'unknown',
      score: s.conformityScore,
    }))

    // Priorisation actionnable — OIV jamais contrôlés, conformité critique, mesures en retard, retards de contrôle.
    const priorities: Priority[] = []
    for (const s of subsidiaries) {
      const controlled = s.activeMissions + s.closedMissions > 0
      const isOiv = s.regulatoryProfile?.criticality === 'oiv'
      if (isOiv && !controlled) priorities.push({ id: s.id, name: s.name, reason: 'OIV jamais contrôlé', severity: 'high' })
      else if (s.conformityScore !== null && s.conformityScore < 40) priorities.push({ id: s.id, name: s.name, reason: `Conformité critique (${s.conformityScore}%)`, severity: 'high' })
      else if (s.overdueCount > 0) priorities.push({ id: s.id, name: s.name, reason: `${s.overdueCount} contrôle(s) en retard`, severity: 'medium' })
      else if (!controlled) priorities.push({ id: s.id, name: s.name, reason: 'Aucun contrôle planifié', severity: 'medium' })
    }
    priorities.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))

    return {
      loading: sLoading || mLoading,
      posture: {
        total: totalCount,
        oiv: subsidiaries.filter((s) => s.regulatoryProfile?.criticality === 'oiv').length,
        avgScore: averageScore,
        activeMissions: totalActiveMissions,
        openMeasures: open.length,
        overdue: totalOverdue,
      },
      riskItems,
      measuresByType,
      deadlines: { soon, overdue: overdueM },
      priorities,
    }
  }, [subsidiaries, measures, sLoading, mLoading, averageScore, totalActiveMissions, totalOverdue, totalCount])
}
