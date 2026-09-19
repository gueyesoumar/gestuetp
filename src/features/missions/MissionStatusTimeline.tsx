import { Send, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import type { MissionStatusEvent, MissionStatusEventType } from '../../types/database.types'

interface MissionStatusTimelineProps {
  events: MissionStatusEvent[]
  title?: string
}

const CONFIG: Record<MissionStatusEventType, { label: string; icon: typeof Send; dot: string; ring: string }> = {
  sent_to_client: { label: 'Envoyé au client', icon: Send, dot: 'text-blue-600', ring: 'bg-blue-100' },
  returned_to_fieldwork: { label: 'Renvoyé en correction (Travaux)', icon: RotateCcw, dot: 'text-amber-600', ring: 'bg-amber-100' },
  client_validated: { label: 'Validé par le client', icon: CheckCircle2, dot: 'text-emerald-600', ring: 'bg-emerald-100' },
  client_rejected: { label: 'Rejeté par le client', icon: XCircle, dot: 'text-red-600', ring: 'bg-red-100' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Frise des événements de mission (envoi client, renvoi, décisions client) — RFC UX Lot 5. */
export function MissionStatusTimeline({ events, title = 'Suivi de la mission' }: MissionStatusTimelineProps): JSX.Element | null {
  if (events.length === 0) return null
  // Plus récent en haut.
  const ordered = [...events].reverse()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-[14px] font-bold text-gray-900 mb-4">{title}</h3>
      <ol className="space-y-4">
        {ordered.map((ev) => {
          const cfg = CONFIG[ev.event_type]
          const Icon = cfg.icon
          return (
            <li key={ev.id} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.ring}`}>
                <Icon size={14} className={cfg.dot} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-gray-900">{cfg.label}</span>
                  <span className="text-[11px] text-gray-400">{formatDate(ev.created_at)}</span>
                  {ev.actor_label && <span className="text-[11px] text-gray-400">· {ev.actor_label}</span>}
                </div>
                {ev.reason && (
                  <p className="text-[12.5px] text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed bg-[#FAFAF8] border border-gray-100 rounded-lg px-3 py-2">
                    {ev.reason}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
