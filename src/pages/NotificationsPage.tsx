import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCheck, Settings } from 'lucide-react'
import { useNotifications } from '../features/notifications/useNotifications'
import { resolveNotificationLink } from '../features/notifications/notificationLink'
import { groupNotificationsByAge } from '../features/notifications/notificationGroups'
import { NotificationRow } from '../features/notifications/NotificationRow'
import { useEdition } from '../features/edition/EditionContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { EmptyState } from '../components/ui/EmptyState'
import type { Notification } from '../types/database.types'

type Filter = 'all' | 'unread'

export function NotificationsPage(): JSX.Element {
  const navigate = useNavigate()
  const { hasCapability } = useEdition()
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, hasMore, loadingMore, loadMore } = useNotifications()
  const [filter, setFilter] = useState<Filter>('all')

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const open = async (n: Notification): Promise<void> => {
    if (!n.is_read) await markAsRead(n.id)
    if (n.link) navigate(resolveNotificationLink(n.link, hasCapability('supervision')))
  }

  const visible = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications
  const groups = groupNotificationsByAge(visible)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes les notifications sont lues'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${filter === f ? 'bg-white text-forest-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {f === 'all' ? 'Toutes' : 'Non lues'}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] font-medium text-gray-600 transition-colors hover:border-forest-300 hover:bg-forest-50 hover:text-forest-700">
              <CheckCheck size={15} /> Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          description={filter === 'unread' ? 'Tout est à jour.' : 'Vous serez notifié des soumissions, validations et rejets.'}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="mb-2 ml-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">{g.label}</h3>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {g.items.map((n) => <NotificationRow key={n.id} notif={n} onOpen={open} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <button onClick={() => void loadMore()} disabled={loadingMore} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:border-forest-300 hover:bg-forest-50 hover:text-forest-700 disabled:opacity-50">
            {loadingMore ? 'Chargement...' : 'Charger plus'}
          </button>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4 text-center">
        <Link to="/compte?tab=notifications" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest-700 hover:text-forest-900">
          <Settings size={15} /> Préférences de notification
        </Link>
      </div>
    </div>
  )
}
