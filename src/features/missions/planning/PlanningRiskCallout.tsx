import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, ListChecks } from 'lucide-react'
import type { ControlPlanning } from '../../../types/database.types'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { ControlAssignmentRow } from '../useMissionDetail'
import type { AuditTopicWithControls } from './useAuditTopics'
import type { InterviewWithRelations } from './usePlanningData'

interface PlanningRiskCalloutProps {
  domains: DomainWithControls[]
  plannings: ControlPlanning[]
  assignments: ControlAssignmentRow[]
  topics: AuditTopicWithControls[]
  interviews: InterviewWithRelations[]
  onSelectControls: (ids: string[]) => void
}

interface Issue {
  id: string
  severity: 'critical' | 'high' | 'medium'
  label: string
  detail: string
  controlIds: string[]
}

const SEV_CFG: Record<Issue['severity'], { dot: string; cls: string }> = {
  critical: { dot: 'bg-red-500', cls: 'text-red-700' },
  high: { dot: 'bg-amber-500', cls: 'text-amber-700' },
  medium: { dot: 'bg-yellow-500', cls: 'text-yellow-700' },
}

export function PlanningRiskCallout({ domains, plannings, assignments, topics, interviews, onSelectControls }: PlanningRiskCalloutProps) {
  const [open, setOpen] = useState(true)

  const issues = useMemo<Issue[]>(() => {
    const planMap = new Map(plannings.map((p) => [p.control_id, p]))
    const assignSet = new Set(assignments.map((a) => a.control_id))
    const allControls = domains.flatMap((d) => d.controls)

    // Topics covering each control
    const topicsByControl = new Map<string, string[]>()
    for (const t of topics) {
      for (const cid of t.control_ids) {
        const arr = topicsByControl.get(cid) ?? []
        arr.push(t.id)
        topicsByControl.set(cid, arr)
      }
    }

    // Topics covered by at least one scheduled (non-cancelled) interview
    const coveredTopicIds = new Set<string>()
    for (const iv of interviews) {
      if (iv.status === 'cancelled') continue
      for (const tid of iv.topic_ids) coveredTopicIds.add(tid)
    }

    const out: Issue[] = []

    // 1. Non affectés
    const unassigned = allControls.filter((c) => !assignSet.has(c.id)).map((c) => c.id)
    if (unassigned.length > 0) {
      out.push({
        id: 'unassigned',
        severity: 'high',
        label: `${unassigned.length} contrôle${unassigned.length > 1 ? 's' : ''} non affecté${unassigned.length > 1 ? 's' : ''}`,
        detail: 'Aucun auditeur n’est désigné pour ces contrôles.',
        controlIds: unassigned,
      })
    }

    // 2. Critique/Élevé sans technique
    const noTechnique = allControls
      .filter((c) => {
        const p = planMap.get(c.id)
        const risk = p?.risk_level ?? 'medium'
        if (risk !== 'critical' && risk !== 'high') return false
        const techs = p?.audit_techniques ?? []
        return techs.length === 0
      })
      .map((c) => c.id)
    if (noTechnique.length > 0) {
      out.push({
        id: 'no-technique',
        severity: 'critical',
        label: `${noTechnique.length} contrôle${noTechnique.length > 1 ? 's' : ''} à risque sans technique d’audit`,
        detail: 'Critique ou Élevé sans technique d’audit définie — risque de couverture insuffisante.',
        controlIds: noTechnique,
      })
    }

    // 3. Critique sans entretien (au moins un sujet de ce contrôle couvert par un entretien)
    const criticalNoInterview = allControls
      .filter((c) => {
        const p = planMap.get(c.id)
        if (p?.risk_level !== 'critical') return false
        const tids = topicsByControl.get(c.id) ?? []
        if (tids.length === 0) return true // critique mais aucun sujet ne le couvre
        return !tids.some((tid) => coveredTopicIds.has(tid))
      })
      .map((c) => c.id)
    if (criticalNoInterview.length > 0) {
      out.push({
        id: 'critical-no-interview',
        severity: 'high',
        label: `${criticalNoInterview.length} contrôle${criticalNoInterview.length > 1 ? 's' : ''} critique${criticalNoInterview.length > 1 ? 's' : ''} sans entretien`,
        detail: 'Aucun entretien planifié ne couvre ces contrôles critiques via un sujet rattaché.',
        controlIds: criticalNoInterview,
      })
    }

    return out
  }, [domains, plannings, assignments, topics, interviews])

  if (issues.length === 0) return null

  return (
    <div className="mx-4 mt-3 rounded-xl border border-amber-300 bg-amber-50/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-amber-100/40 transition-colors text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} className="text-amber-700 shrink-0" /> : <ChevronRight size={14} className="text-amber-700 shrink-0" />}
        <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0">
          <AlertTriangle size={12} />
        </div>
        <h3 className="text-[13px] font-semibold text-amber-900 flex-1">
          {issues.length} anomalie{issues.length > 1 ? 's' : ''} de planification à corriger
        </h3>
        <span className="text-[10px] text-amber-700 font-medium">Recommandations actionnables</span>
      </button>
      {open && (
        <ul className="divide-y divide-amber-200/60 border-t border-amber-200/60">
          {issues.map((iss) => {
            const cfg = SEV_CFG[iss.severity]
            return (
              <li key={iss.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-amber-50/40">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold ${cfg.cls}`}>{iss.label}</p>
                  <p className="text-[11px] text-gray-600 leading-snug">{iss.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectControls(iss.controlIds)}
                  className="text-[11px] font-semibold text-forest-700 bg-white border border-forest-300 hover:bg-forest-50 px-2.5 py-1 rounded-lg shrink-0 inline-flex items-center gap-1"
                >
                  <ListChecks size={11} /> Sélectionner
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
