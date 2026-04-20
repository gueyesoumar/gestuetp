import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Breadcrumb } from './Breadcrumb'
import { BellIcon } from '../icons/NavIcons'
import { Badge } from '../ui/Badge'
import { useNotifications } from '../../features/notifications/useNotifications'
import type { NotificationType } from '../../types/database.types'

interface TopBarProps {
  onMenuToggle: () => void
}

const typeConfig: Record<NotificationType, { label: string; variant: 'forest' | 'gold' | 'red' | 'green' | 'gray' }> = {
  submission: { label: 'Soumission', variant: 'forest' },
  approval: { label: 'Approbation', variant: 'green' },
  rejection: { label: 'Rejet', variant: 'red' },
  client_response: { label: 'Client', variant: 'gold' },
  mission_closure: { label: 'Cl\u00f4ture', variant: 'green' },
  invitation: { label: 'Invitation', variant: 'forest' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '\u00c0 l\u2019instant'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hier'
  return `${days}j`
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const recent = notifications.slice(0, 5)

  useEffect(() => {
    if (!panelOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [panelOpen])

  const handleClick = async (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) await markAsRead(id)
    setPanelOpen(false)
    if (link) navigate(link)
  }

  return (
    <header className="flex h-14 items-center border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-500 hover:bg-forest-50 lg:hidden"
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="hidden lg:block">
        <Breadcrumb />
      </div>

      <div className="flex-1" />

      {/* Bell icon */}
      <div ref={panelRef} className="relative">
        <button
          onClick={() => setPanelOpen((prev) => !prev)}
          className="relative rounded-lg p-2 text-gray-400 hover:bg-forest-50 hover:text-forest-700 transition-colors"
          aria-label="Notifications"
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {panelOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-[13px] font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-gray-400">
                Aucune notification
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {recent.map((n) => {
                  const cfg = typeConfig[n.type] ?? typeConfig.submission
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n.id, n.link, n.is_read)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-b-0 transition-colors ${
                        n.is_read ? 'hover:bg-gray-50' : 'bg-forest-50/40 hover:bg-forest-50'
                      }`}
                    >
                      <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-gray-200' : 'bg-forest-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[12px] font-medium truncate ${n.is_read ? 'text-gray-500' : 'text-gray-900'}`}>
                            {n.title}
                          </span>
                          <Badge label={cfg.label} variant={cfg.variant} />
                        </div>
                        {n.body && (
                          <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-1">{n.body}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5">
                        {timeAgo(n.created_at)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => { setPanelOpen(false); navigate('/notifications') }}
              className="flex w-full items-center justify-center border-t border-gray-100 px-4 py-2.5 text-[12px] font-medium text-forest-700 hover:bg-forest-50 transition-colors"
            >
              Voir toutes les notifications
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
