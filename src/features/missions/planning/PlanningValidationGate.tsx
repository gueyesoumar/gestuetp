import { useMemo, useState } from 'react'
import { Check, AlertTriangle, X, Lock, ArrowRight, Loader2 } from 'lucide-react'
import type { ControlPlanning, ClientContact } from '../../../types/database.types'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { ControlAssignmentRow } from '../useMissionDetail'
import type { AuditTopicWithControls } from './useAuditTopics'
import type { InterviewWithRelations } from './usePlanningData'

interface PlanningValidationGateProps {
  domains: DomainWithControls[]
  plannings: ControlPlanning[]
  assignments: ControlAssignmentRow[]
  contacts: ClientContact[]
  interviews: InterviewWithRelations[]
  topics: AuditTopicWithControls[]
  validating: boolean
  onValidate: () => Promise<void>
}

interface CheckItem {
  key: string
  label: string
  detail: string
  blocker: boolean
  ok: boolean
  countLabel: string
}

export function PlanningValidationGate({ domains, plannings, assignments, contacts, interviews, topics, validating, onValidate }: PlanningValidationGateProps) {
  const [confirming, setConfirming] = useState(false)

  const checks = useMemo<CheckItem[]>(() => {
    const allControls = domains.flatMap((d) => d.controls)
    const totalControls = allControls.length
    const planMap = new Map(plannings.map((p) => [p.control_id, p]))
    const assignSet = new Set(assignments.map((a) => a.control_id))

    // 1. Tous les contrôles ont un auditeur
    const assignedCount = allControls.filter((c) => assignSet.has(c.id)).length

    // 2. Tous les contrôles ont au moins 1 technique d'audit
    const withTechnique = allControls.filter((c) => {
      const p = planMap.get(c.id)
      return p?.audit_techniques && p.audit_techniques.length > 0
    }).length

    // 3. Au moins 1 acteur SI
    const actorsCount = contacts.length

    // 4. Au moins 1 entretien planifié (non annulé)
    const activeInterviews = interviews.filter((iv) => iv.status !== 'cancelled')

    // 5. Couverture critique : chaque contrôle critique a au moins 1 entretien
    const topicsByControl = new Map<string, string[]>()
    for (const t of topics) {
      for (const cid of t.control_ids) {
        const arr = topicsByControl.get(cid) ?? []
        arr.push(t.id)
        topicsByControl.set(cid, arr)
      }
    }
    const coveredTopicIds = new Set<string>()
    for (const iv of activeInterviews) for (const tid of iv.topic_ids) coveredTopicIds.add(tid)
    const criticalControls = allControls.filter((c) => planMap.get(c.id)?.risk_level === 'critical')
    const criticalCovered = criticalControls.filter((c) => {
      const tids = topicsByControl.get(c.id) ?? []
      return tids.some((tid) => coveredTopicIds.has(tid))
    }).length

    // 6. Domaines avec au moins 1 sujet
    const domainsWithTopics = domains.filter((d) => {
      const ctrlIds = new Set(d.controls.map((c) => c.id))
      return topics.some((t) => t.control_ids.some((cid) => ctrlIds.has(cid)))
    }).length

    return [
      {
        key: 'assigned',
        label: 'Tous les contrôles affectés à un auditeur',
        detail: 'Chaque contrôle doit avoir un responsable.',
        blocker: true,
        ok: totalControls > 0 && assignedCount === totalControls,
        countLabel: `${assignedCount}/${totalControls}`,
      },
      {
        key: 'technique',
        label: 'Tous les contrôles ont au moins 1 technique d’audit',
        detail: 'Inspection, entretien, observation, etc.',
        blocker: true,
        ok: totalControls > 0 && withTechnique === totalControls,
        countLabel: `${withTechnique}/${totalControls}`,
      },
      {
        key: 'actors',
        label: 'Au moins 1 acteur SI renseigné',
        detail: 'Configurez les interlocuteurs côté client (Phase Cadrage > Acteurs).',
        blocker: true,
        ok: actorsCount > 0,
        countLabel: `${actorsCount}`,
      },
      {
        key: 'interviews',
        label: 'Au moins 1 entretien planifié',
        detail: 'Génère depuis la matrice ou crée manuellement.',
        blocker: true,
        ok: activeInterviews.length > 0,
        countLabel: `${activeInterviews.length}`,
      },
      {
        key: 'critical-coverage',
        label: 'Contrôles critiques couverts par un entretien',
        detail: 'Chaque contrôle classé Critique devrait être abordé en entretien.',
        blocker: false,
        ok: criticalControls.length === 0 || criticalCovered === criticalControls.length,
        countLabel: criticalControls.length === 0 ? '—' : `${criticalCovered}/${criticalControls.length}`,
      },
      {
        key: 'domains-topics',
        label: 'Tous les domaines couverts par un sujet d’audit',
        detail: 'Aide à structurer les entretiens via la matrice.',
        blocker: false,
        ok: domains.length === 0 || domainsWithTopics === domains.length,
        countLabel: `${domainsWithTopics}/${domains.length}`,
      },
    ]
  }, [domains, plannings, assignments, contacts, interviews, topics])

  const blockers = checks.filter((c) => c.blocker)
  const warnings = checks.filter((c) => !c.blocker)
  const blockersOk = blockers.every((c) => c.ok)
  const warningsKO = warnings.filter((c) => !c.ok)
  const allGreen = checks.every((c) => c.ok)

  const handleClick = (): void => {
    if (!blockersOk) return
    if (warningsKO.length > 0) {
      setConfirming(true)
    } else {
      void onValidate()
    }
  }

  const confirmAndValidate = async (): Promise<void> => {
    setConfirming(false)
    await onValidate()
  }

  const containerCls = blockersOk
    ? allGreen
      ? 'border-green-300 bg-green-50/50'
      : 'border-amber-300 bg-amber-50/40'
    : 'border-red-300 bg-red-50/40'

  const headerLabel = blockersOk
    ? allGreen
      ? 'Prêt à passer en phase Travaux'
      : `Prêt avec ${warningsKO.length} avertissement${warningsKO.length > 1 ? 's' : ''}`
    : `${blockers.filter((b) => !b.ok).length} prérequis manquant${blockers.filter((b) => !b.ok).length > 1 ? 's' : ''} avant validation`

  return (
    <div className={`mx-4 mt-3 rounded-xl border ${containerCls} overflow-hidden`}>
      <div className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-200/60">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${blockersOk ? (allGreen ? 'bg-green-500 text-white' : 'bg-amber-500 text-white') : 'bg-red-500 text-white'}`}>
          {blockersOk ? (allGreen ? <Check size={16} /> : <AlertTriangle size={16} />) : <Lock size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900">{headerLabel}</p>
          <p className="text-[11px] text-gray-500 leading-snug">
            Vérifiez les prérequis ci-dessous avant de basculer en phase Travaux.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={!blockersOk || validating}
          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
            !blockersOk
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-forest-700 text-white hover:bg-forest-900'
          } disabled:opacity-50`}
        >
          {validating ? <><Loader2 size={12} className="animate-spin" /> Validation...</> : <>Valider et passer en Travaux <ArrowRight size={12} /></>}
        </button>
      </div>

      <ul className="px-4 py-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 py-1">
            <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.ok ? 'bg-green-100 text-green-700' : c.blocker ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {c.ok ? <Check size={10} /> : c.blocker ? <X size={10} /> : <AlertTriangle size={10} />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[12px] font-medium ${c.ok ? 'text-gray-700' : c.blocker ? 'text-red-700' : 'text-amber-800'}`}>
                  {c.label}
                </span>
                <span className="text-[10px] font-mono text-gray-400 ml-auto">{c.countLabel}</span>
              </div>
              {!c.ok && <p className="text-[10.5px] text-gray-500 leading-snug">{c.detail}</p>}
            </div>
          </li>
        ))}
      </ul>

      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirming(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-200 bg-amber-50 flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-700" />
              <p className="text-[14px] font-bold text-amber-900 flex-1">Avertissements avant validation</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] text-gray-600 mb-3 leading-relaxed">
                Les éléments suivants ne sont pas bloquants mais peuvent affecter la qualité de l’audit :
              </p>
              <ul className="space-y-1.5">
                {warningsKO.map((w) => (
                  <li key={w.key} className="text-[12px] text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={12} className="mt-0.5 text-amber-600 shrink-0" />
                    <span>{w.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 bg-[#FAFAFA] flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[12px] text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Revenir corriger
              </button>
              <button
                type="button"
                onClick={() => void confirmAndValidate()}
                className="bg-forest-700 text-white px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-forest-900 inline-flex items-center gap-1.5"
              >
                Valider quand même <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
