import { useMemo } from 'react'
import { STATUS_TO_PHASE_INDEX, MISSION_PHASES, isAssessmentCompleted, isAssessmentApproved } from './mission-constants'
import type { MissionDetail } from './useMissionDetail'
import type { AssessmentWithControl } from './useAuditorAssessments'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'

export interface MissionProgress {
  phaseIndex: number
  overallPercent: number
  daysRemaining: number | null
  totalControls: number
  /** Contr\u00f4les avec assessment soumis ou valid\u00e9 (cf. isAssessmentCompleted). */
  assessedControls: number
  approvedControls: number
  /** Contr\u00f4les dont l'assessment est uniquement soumis ou en revue (pas encore valid\u00e9). */
  submittedControls: number
  provisionalScore: number
  nextAction: { label: string; ctaLabel: string; tab: string } | null
  phases: { key: string; label: string; state: 'done' | 'active' | 'locked'; sublabel?: string }[]
}

/**
 * @param scopeControlIds Optional. When provided, restricts the progress
 *   computation to those control IDs. Used to give an auditor an accurate
 *   stepper / KPI based only on their assigned controls.
 */
export function useMissionProgress(
  mission: MissionDetail | null,
  assessments: AssessmentWithControl[],
  domains: DomainWithControls[],
  scopeControlIds?: Set<string>,
): MissionProgress {
  return useMemo(() => {
    if (!mission) {
      return {
        phaseIndex: -1, overallPercent: 0, daysRemaining: null,
        totalControls: 0, assessedControls: 0, approvedControls: 0, submittedControls: 0,
        provisionalScore: 0, nextAction: null, phases: [],
      }
    }

    // P\u00e9rim\u00e8tre filtr\u00e9 : si scopeControlIds est fourni, on ne regarde que
    // ces contr\u00f4les. Coh\u00e9rence garantie sur stepper, KPI et progression.
    const scopedDomains = scopeControlIds
      ? domains.map((d) => ({ ...d, controls: d.controls.filter((c) => scopeControlIds.has(c.id)) }))
      : domains
    const scopedAssessments = scopeControlIds
      ? assessments.filter((a) => scopeControlIds.has(a.control_id))
      : assessments

    const phaseIndex = STATUS_TO_PHASE_INDEX[mission.status]
    const totalControls = scopedDomains.reduce((sum, d) => sum + d.controls.length, 0)
    const assessedControls = scopedAssessments.filter((a) => isAssessmentCompleted(a.status)).length
    const approvedControls = scopedAssessments.filter((a) => isAssessmentApproved(a.status)).length
    const submittedControls = scopedAssessments.filter((a) => a.status === 'submitted' || a.status === 'in_review').length
    const provisionalScore = assessedControls > 0 ? Math.round((approvedControls / assessedControls) * 100) : 0

    const overallPercent = totalControls > 0
      ? Math.round(((phaseIndex + 1) / 6) * 50 + (assessedControls / totalControls) * 50)
      : Math.round(((phaseIndex + 1) / 6) * 100)

    let daysRemaining: number | null = null
    if (mission.end_date) {
      const diff = new Date(mission.end_date).getTime() - Date.now()
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    const draftCount = scopedAssessments.filter((a) => a.status === 'draft' || a.status === 'rejected').length
    const nextAction = computeNextAction(mission.status, draftCount, submittedControls, totalControls, assessedControls)

    const phases = MISSION_PHASES.map((p) => {
      let state: 'done' | 'active' | 'locked' = 'locked'
      if (p.index < phaseIndex) state = 'done'
      else if (p.index === phaseIndex) state = 'active'

      let sublabel: string | undefined
      if (state === 'done') sublabel = 'Termin\u00e9'
      if (state === 'active' && p.key === 'fieldwork') {
        sublabel = `${assessedControls}/${totalControls} contr\u00f4les`
      }

      return { key: p.key, label: p.label, state, sublabel }
    })

    return {
      phaseIndex, overallPercent, daysRemaining,
      totalControls, assessedControls, approvedControls, submittedControls,
      provisionalScore, nextAction, phases,
    }
  }, [mission, assessments, domains, scopeControlIds])
}

function computeNextAction(
  status: string,
  draftCount: number,
  submittedCount: number,
  totalControls: number,
  assessedCount: number
): MissionProgress['nextAction'] {
  if (status === 'initialization' || status === 'scoping') {
    return { label: 'Compl\u00e9tez le cadrage de la mission.', ctaLabel: 'D\u00e9marrer le cadrage', tab: 'scoping' }
  }
  if (status === 'planning') {
    return { label: 'Finalisez le programme de travail.', ctaLabel: 'Planifier', tab: 'planning' }
  }
  if (status === 'fieldwork' && draftCount > 0) {
    return { label: `${draftCount} contr\u00f4les restent \u00e0 r\u00e9diger.`, ctaLabel: 'Reprendre les travaux', tab: 'fieldwork' }
  }
  if (status === 'internal_review' && submittedCount > 0) {
    return { label: `${submittedCount} contr\u00f4les \u00e0 valider.`, ctaLabel: 'Revoir les travaux', tab: 'review' }
  }
  if (status === 'client_review') {
    return { label: 'En attente de validation client.', ctaLabel: 'Voir le suivi', tab: 'client_review' }
  }
  if (status === 'fieldwork' && assessedCount === totalControls && totalControls > 0) {
    return { label: 'Tous les contr\u00f4les r\u00e9dig\u00e9s. Pr\u00eat pour la revue.', ctaLabel: 'Lancer la revue', tab: 'review' }
  }
  return null
}
