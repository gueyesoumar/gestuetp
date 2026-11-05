import { useEffect, useMemo, useState } from 'react'
import { Check, AlertTriangle, X, Lock, ArrowRight, Loader2, ChevronRight, ChevronDown } from 'lucide-react'
import type { ClientContact } from '../../../types/database.types'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { ControlAssignmentRow } from '../useMissionDetail'
import type { InterviewWithRelations } from './usePlanningData'

interface PlanningValidationGateProps {
  domains: DomainWithControls[]
  assignments: ControlAssignmentRow[]
  contacts: ClientContact[]
  interviews: InterviewWithRelations[]
  validating: boolean
  serverMissing?: { key: string; label: string; count: number; total: number }[] | null
  onValidate: () => Promise<void>
  /** Sous-étape Entretiens active (RFC 0009). Si false, on masque les checks liés aux entretiens. */
  showInterviewChecks?: boolean
  /** Rend chaque prérequis manquant actionnable (filtre la table / change d'onglet). */
  onFix?: (key: string) => void
  /** Contrôles exclus du périmètre (mission_exclusions) : ignorés par les prérequis. */
  excludedControlIds?: Set<string>
}

// Checks liés aux entretiens - masqués si la sous-étape Entretiens est désélectionnée.
const INTERVIEW_CHECK_KEYS = ['interviews']

interface CheckItem {
  key: string
  label: string
  detail: string
  blocker: boolean
  ok: boolean
  countLabel: string
}

export function PlanningValidationGate({ domains, assignments, contacts, interviews, validating, serverMissing, onValidate, showInterviewChecks = true, onFix, excludedControlIds }: PlanningValidationGateProps) {
  const [confirming, setConfirming] = useState(false)
  // Détail des prérequis replié par défaut (gain de place) ; préférence mémorisée.
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('planning-gate-open') === '1' } catch { return false }
  })
  const toggleOpen = (): void => setOpen((o) => {
    const n = !o
    try { localStorage.setItem('planning-gate-open', n ? '1' : '0') } catch { /* indisponible */ }
    return n
  })
  // Un refus serveur doit être visible : on déplie d'office.
  useEffect(() => { if (serverMissing && serverMissing.length > 0) setOpen(true) }, [serverMissing])

  const checks = useMemo<CheckItem[]>(() => {
    // Les contrôles exclus du périmètre ne comptent dans aucun prérequis (cohérent
    // avec le RPC serveur, mig 00372).
    const allControls = domains.flatMap((d) => d.controls).filter((c) => !excludedControlIds?.has(c.id))
    const totalControls = allControls.length
    const assignSet = new Set(assignments.map((a) => a.control_id))

    // 1. Tous les contrôles ont un auditeur
    const assignedCount = allControls.filter((c) => assignSet.has(c.id)).length

    // 2. Au moins 1 acteur SI
    const actorsCount = contacts.length

    // 4. Au moins 1 entretien planifié (non annulé)
    const activeInterviews = interviews.filter((iv) => iv.status !== 'cancelled')

    const all: CheckItem[] = [
      {
        key: 'assigned',
        label: 'Tous les contrôles affectés à un auditeur',
        detail: 'Chaque contrôle doit avoir un responsable.',
        blocker: true,
        ok: totalControls > 0 && assignedCount === totalControls,
        countLabel: `${assignedCount}/${totalControls}`,
      },
      {
        key: 'actors',
        label: 'Au moins 1 acteur SI renseigné',
        detail: 'Ajoutez les interlocuteurs côté client dans l’onglet « Acteurs ».',
        blocker: false,
        ok: actorsCount > 0,
        countLabel: `${actorsCount}`,
      },
      {
        key: 'interviews',
        label: 'Au moins 1 entretien planifié',
        detail: 'Planifiez un entretien avec les interlocuteurs.',
        blocker: false,
        ok: activeInterviews.length > 0,
        countLabel: `${activeInterviews.length}`,
      },
    ]
    return showInterviewChecks ? all : all.filter((c) => !INTERVIEW_CHECK_KEYS.includes(c.key))
  }, [domains, assignments, contacts, interviews, showInterviewChecks, excludedControlIds])

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
      <div className={`px-4 py-2.5 flex items-center gap-3 ${open || (serverMissing && serverMissing.length > 0) ? 'border-b border-gray-200/60' : ''}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${blockersOk ? (allGreen ? 'bg-green-500 text-white' : 'bg-amber-500 text-white') : 'bg-red-500 text-white'}`}>
          {blockersOk ? (allGreen ? <Check size={16} /> : <AlertTriangle size={16} />) : <Lock size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900">{headerLabel}</p>
          <p className="text-[11px] text-gray-500 leading-snug">
            {open ? 'Vérifiez les prérequis ci-dessous avant de basculer en phase Travaux.' : 'Prérequis à satisfaire avant de basculer en phase Travaux.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-gray-600 border border-gray-200 bg-white hover:border-forest-400 transition-colors"
        >
          Détails {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
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

      {serverMissing && serverMissing.length > 0 && (
        <div className="mx-4 my-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
          <p className="text-[11px] font-bold text-red-800 mb-1 flex items-center gap-1.5">
            <Lock size={11} /> Le serveur a refusé la validation
          </p>
          <ul className="space-y-0.5">
            {serverMissing.map((m) => (
              <li key={m.key} className="text-[11px] text-red-700 flex items-center gap-1.5">
                <X size={10} /> {m.label} <span className="text-[10px] font-mono text-red-500">({m.count}/{m.total})</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-red-600 mt-1 italic">
            Les données ont peut-être changé pendant que vous travailliez. La page sera rafraîchie.
          </p>
        </div>
      )}

      {open && (
      <ul className="px-4 py-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 py-1">
            <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.ok ? 'bg-green-100 text-green-700' : c.blocker ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {c.ok ? <Check size={10} /> : c.blocker ? <X size={10} /> : <AlertTriangle size={10} />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[12px] font-medium ${c.ok ? 'text-gray-700' : c.blocker ? 'text-red-700' : 'text-amber-800'}`}>
                  {c.label}
                </span>
                {!c.ok && !c.blocker && <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">Avertissement</span>}
                <span className="text-[10px] font-mono text-gray-400 ml-auto">{c.countLabel}</span>
                {!c.ok && onFix && (
                  <button type="button" onClick={() => onFix(c.key)} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-forest-700 hover:border-forest-400">Corriger</button>
                )}
              </div>
              {!c.ok && <p className="text-[10.5px] text-gray-500 leading-snug">{c.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
      )}

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
