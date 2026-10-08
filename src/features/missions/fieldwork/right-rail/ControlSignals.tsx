import { AlertTriangle, HelpCircle, MessageSquare, Clock, ChevronRight, ScanSearch } from 'lucide-react'
import { useControlExpectedEvidence } from '../useControlExpectedEvidence'
import { useControlContext } from './useControlContext'
import { getCadrageHint } from './cadrageHint'

interface ControlSignalsProps {
  missionId: string
  controlId: string
  unreadCount: number
  missionEndDate: string | null
  /** Statut de l'évaluation : l'échéance ne s'affiche plus une fois approuvé. */
  status: string
  onJump: (sectionId: string) => void
}

interface Signal {
  key: string
  icon: JSX.Element
  tone: string
  node: JSX.Element
  jump: string
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

/**
 * Bloc « Signaux » (rail copilote, incrément 1) : fait remonter ce qui compte pour
 * CE contrôle — preuves manquantes, cadrage qui le justifie, discussion non lue,
 * échéance de revue. Chaque signal déroule la section correspondante au clic.
 */
export function ControlSignals({ missionId, controlId, unreadCount, missionEndDate, status, onJump }: ControlSignalsProps) {
  const { items } = useControlExpectedEvidence(missionId, controlId)
  const ctx = useControlContext(missionId, controlId)

  const signals: Signal[] = []

  // Pré-suggestion de verdict : le cadrage contient une réponse défavorable sur ce contrôle.
  const hint = getCadrageHint(ctx.cadrageAnswers)
  if (hint && status !== 'approved') {
    signals.push({
      key: 'cadrage-gap', jump: 'contexte', tone: 'bg-red-50 text-red-600',
      icon: <ScanSearch size={11} />,
      node: <>Le cadrage signale un <b className="font-semibold text-gray-800">écart probable</b>{hint.worstWeight >= 3 ? ' (preuve forte)' : ''} — suggestion : Non conforme</>,
    })
  }

  const missing = items.length - items.filter((i) => i.fulfilled).length
  if (missing > 0) {
    signals.push({
      key: 'evidence', jump: 'preuves', tone: 'bg-amber-50 text-amber-700',
      icon: <AlertTriangle size={11} />,
      node: <><b className="font-semibold text-gray-800">{missing} preuve{missing > 1 ? 's' : ''} manquante{missing > 1 ? 's' : ''}</b> sur {items.length} attendue{items.length > 1 ? 's' : ''}</>,
    })
  }

  if (ctx.cadrageAnswers.length > 0) {
    const n = ctx.cadrageAnswers.length
    signals.push({
      key: 'cadrage', jump: 'contexte', tone: 'bg-violet-50 text-violet-700',
      icon: <HelpCircle size={11} />,
      node: <><b className="font-semibold text-gray-800">{n} réponse{n > 1 ? 's' : ''} de cadrage</b> justifie{n > 1 ? 'nt' : ''} ce contrôle</>,
    })
  }

  if (unreadCount > 0) {
    signals.push({
      key: 'discussion', jump: 'discussion', tone: 'bg-red-50 text-red-600',
      icon: <MessageSquare size={11} />,
      node: <><b className="font-semibold text-gray-800">{unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}</b> dans la discussion</>,
    })
  }

  const days = daysUntil(missionEndDate)
  if (days != null && status !== 'approved' && days <= 14) {
    signals.push({
      key: 'due', jump: 'validation', tone: days < 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
      icon: <Clock size={11} />,
      node: days < 0
        ? <><b className="font-semibold text-gray-800">Échéance dépassée</b> de {-days} jour{-days > 1 ? 's' : ''}</>
        : <>Échéance dans <b className="font-semibold text-gray-800">{days} jour{days > 1 ? 's' : ''}</b></>,
    })
  }

  if (signals.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <p className="px-2.5 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-gold-600">Signaux</p>
      {signals.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onJump(s.jump)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 border-t border-gray-50 text-left hover:bg-gray-50"
        >
          <span className={`w-[18px] h-[18px] rounded-md grid place-items-center shrink-0 ${s.tone}`}>{s.icon}</span>
          <span className="flex-1 min-w-0 text-[11.5px] text-gray-600 leading-snug">{s.node}</span>
          <ChevronRight size={13} className="text-gray-300 shrink-0" />
        </button>
      ))}
    </div>
  )
}
