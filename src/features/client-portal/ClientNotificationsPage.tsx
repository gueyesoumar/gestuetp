import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../notifications/useNotifications'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

// Portail client : réutilise le hook partagé useNotifications (fetch + temps réel RFC
// n°17 Lot 2 + marquage lu). La RLS garantit que le client ne voit que ses notifs.
export function ClientNotificationsPage(): JSX.Element {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()

  if (loading) return <LoadingSpinner />

  const handleClick = (id: string, link: string | null, isRead: boolean): void => {
    if (!isRead) void markAsRead(id)
    if (link) navigate(link)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={() => void markAllAsRead()} className="text-[12px] font-medium text-forest-700 hover:underline">
            Tout marquer comme lu ({unreadCount})
          </button>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-5">Activit&eacute; r&eacute;cente sur vos missions</p>

      {notifications.length > 0 ? (
        <div className="space-y-1.5">
          {notifications.map((n) => (
            <div key={n.id}
              onClick={() => handleClick(n.id, n.link, n.is_read)}
              className={`flex gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${n.is_read ? 'border-gray-200 bg-white' : 'border-forest-200 bg-forest-50'}`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-forest-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{n.title}</p>
                {n.body && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
              </div>
              <span className="text-[10px] text-gray-300 shrink-0">{formatRelativeDate(n.created_at)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-300 text-sm">Aucune notification.</div>
      )}
    </div>
  )
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
