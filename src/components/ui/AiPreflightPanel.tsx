import { ShieldAlert, ShieldCheck, Info } from 'lucide-react'
import { aiSkipNotice, type AiSkipReason } from '../../features/missions/aiSkip'

/**
 * Panneau pré-vol (RFC 0012, P2) : explique pourquoi une action IA a été court-circuitée
 * (IA coupée, accord client requis, envoi bloqué) au lieu d'un simple toast. Rendu inline.
 */
const STYLES = {
  info: { cls: 'bg-blue-50 border-blue-200 text-blue-800', Icon: Info },
  warning: { cls: 'bg-amber-50 border-amber-200 text-amber-800', Icon: ShieldCheck },
  blocked: { cls: 'bg-red-50 border-red-200 text-red-800', Icon: ShieldAlert },
} as const

export function AiPreflightPanel({ reason, onDismiss }: { reason: AiSkipReason | null; onDismiss?: () => void }): JSX.Element | null {
  if (!reason) return null
  const notice = aiSkipNotice(reason)
  const { cls, Icon } = STYLES[notice.tone]
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold">{notice.title}</p>
        <p className="mt-0.5 text-[13px] opacity-90">{notice.message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium underline opacity-70 hover:opacity-100"
        >
          Fermer
        </button>
      )}
    </div>
  )
}
