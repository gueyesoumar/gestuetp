import { CheckCircle2, Clock, FileEdit, MessageSquare, XCircle } from 'lucide-react'
import type { CorrectiveActionRequest } from '../../../types/database.types'

interface CARTimelineProps {
  car: CorrectiveActionRequest
  /** Map id → display name pour l'auteur de création et l'auditeur vérifieur */
  userNames?: Map<string, string>
  /** Map id → nom contact client (pour responsable de la réponse) */
  contactNames?: Map<string, string>
}

interface Event {
  icon: typeof CheckCircle2
  iconClass: string
  title: string
  date: string | null
  author?: string | null
  body?: string | null
}

function formatDateTime(d: string | null): string | null {
  if (!d) return null
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function CARTimeline({ car, userNames, contactNames }: CARTimelineProps): JSX.Element {
  const events: Event[] = []

  // 1. Création par l'auditeur
  events.push({
    icon: FileEdit,
    iconClass: 'text-forest-700 bg-forest-50 border-forest-200',
    title: 'Action corrective créée',
    date: formatDateTime(car.created_at),
    author: userNames?.get(car.created_by) ?? 'Auditeur',
    body: null,
  })

  // 2. Réponse du client (heuristique : si présent et pas verified)
  const hasClientResponse = !!(car.client_root_cause || car.client_action || car.client_target_date)
  if (hasClientResponse) {
    const responsibleName = car.client_responsible_id ? contactNames?.get(car.client_responsible_id) : null
    events.push({
      icon: MessageSquare,
      iconClass: 'text-blue-600 bg-blue-50 border-blue-200',
      title: 'Réponse du client soumise',
      date: formatDateTime(car.updated_at),
      author: responsibleName ?? 'Client',
      body: car.client_action ?? null,
    })
  }

  // 3. Vérification de l'auditeur
  if (car.verified_at) {
    const isAccepted = car.verification_status === 'accepted'
    const isRejected = car.verification_status === 'rejected'
    events.push({
      icon: isAccepted ? CheckCircle2 : isRejected ? XCircle : Clock,
      iconClass: isAccepted
        ? 'text-green-700 bg-green-50 border-green-200'
        : isRejected
        ? 'text-red-700 bg-red-50 border-red-200'
        : 'text-amber-700 bg-amber-50 border-amber-200',
      title: isAccepted
        ? 'Action acceptée'
        : isRejected
        ? 'Action rejetée'
        : 'Précision demandée',
      date: formatDateTime(car.verified_at),
      author: car.verified_by ? (userNames?.get(car.verified_by) ?? 'Auditeur') : 'Auditeur',
      body: car.verification_comment ?? null,
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">Historique</p>
      <div className="space-y-3">
        {events.map((ev, i) => {
          const Icon = ev.icon
          return (
            <div key={i} className="flex gap-3">
              <div className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center ${ev.iconClass}`}>
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{ev.title}</p>
                <p className="text-[11px] text-gray-500">
                  {ev.date}{ev.author ? ` · ${ev.author}` : ''}
                </p>
                {ev.body && (
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{ev.body}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
