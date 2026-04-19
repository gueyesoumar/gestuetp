import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../features/notifications/useNotifications'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { EmptyState } from '../components/ui/EmptyState'
import type { NotificationType } from '../types/database.types'

const typeConfig: Record<NotificationType, { label: string; variant: 'forest' | 'gold' | 'red' | 'green' | 'gray'; dotColor: string }> = {
  submission: { label: 'Soumission', variant: 'forest', dotColor: 'bg-forest-500' },
  approval: { label: 'Approbation', variant: 'green', dotColor: 'bg-success' },
  rejection: { label: 'Rejet', variant: 'red', dotColor: 'bg-error' },
  client_response: { label: 'R\u00e9ponse client', variant: 'gold', dotColor: 'bg-gold-500' },
  mission_closure: { label: 'Cl\u00f4ture', variant: 'green', dotColor: 'bg-success' },
  invitation: { label: 'Invitation', variant: 'forest', dotColor: 'bg-forest-500' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '\u00c0 l\u2019instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } = useNotifications()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const handleClick = async (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) await markAsRead(id)
    if (link) navigate(link)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes les notifications sont lues'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-forest-50 hover:border-forest-300 hover:text-forest-700 transition-colors"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucune notification"
            description="Vous serez notifi&eacute; des soumissions, validations et rejets."
          />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] ?? typeConfig.submission
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n.id, n.link, n.is_read)}
                className={`flex w-full items-start gap-4 px-5 py-4 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                  n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-forest-50/50 hover:bg-forest-50'
                }`}
              >
                <div className="mt-1.5 flex-shrink-0">
                  <div className={`h-2.5 w-2.5 rounded-full ${n.is_read ? 'bg-gray-200' : cfg.dotColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-semibold ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {n.title}
                    </span>
                    <Badge label={cfg.label} variant={cfg.variant} />
                  </div>
                  {n.body && (
                    <p className={`mt-0.5 text-[13px] line-clamp-2 ${n.is_read ? 'text-gray-400' : 'text-gray-600'}`}>
                      {n.body}
                    </p>
                  )}
                  <div className="mt-1 text-[11px] text-gray-300">
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.is_read && (
                  <div className="mt-2 flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-forest-500" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
