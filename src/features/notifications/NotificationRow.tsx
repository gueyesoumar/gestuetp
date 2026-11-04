import { ChevronRight } from 'lucide-react'
import type { Notification } from '../../types/database.types'
import { notifConfig, NOTIF_TONE } from './notificationTypeConfig'

function timeAgo(dateStr: string): string {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 1) return 'À l’instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface NotificationRowProps {
  notif: Notification
  onOpen: (n: Notification) => void
}

/** Ligne de notification : tuile icône typée, titre lu/non-lu, corps, horodatage. */
export function NotificationRow({ notif: n, onOpen }: NotificationRowProps): JSX.Element {
  const cfg = notifConfig(n.type)
  const Icon = cfg.Icon
  return (
    <button
      onClick={() => onOpen(n)}
      className={`group relative flex w-full items-start gap-3.5 border-b border-gray-100 px-4 py-3.5 text-left transition-colors last:border-b-0 ${
        n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-gold-50/60 shadow-[inset_3px_0_0_#D4A843] hover:bg-gold-50'
      }`}
    >
      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${NOTIF_TONE[cfg.tone]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[14px] ${n.is_read ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>{n.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${NOTIF_TONE[cfg.tone]}`}>{cfg.label}</span>
        </div>
        {n.body && <p className={`mt-0.5 line-clamp-2 text-[13px] ${n.is_read ? 'text-gray-500' : 'text-gray-600'}`}>{n.body}</p>}
        <div className="mt-1 text-[11.5px] text-gray-500">{timeAgo(n.created_at)}</div>
      </div>
      <ChevronRight size={16} className="mt-2 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
