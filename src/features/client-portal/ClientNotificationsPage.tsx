import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

interface ClientNotification {
  id: string
  type: string
  title: string
  message: string | null
  isRead: boolean
  createdAt: string
}

export function ClientNotificationsPage(): JSX.Element {
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

      const res = await fetch(
        `${baseUrl}/rest/v1/notifications?select=id,type,title,message,is_read,created_at&order=created_at.desc&limit=30`,
        { headers }
      )

      if (res.ok) {
        const data = await res.json() as Record<string, unknown>[]
        setNotifications(data.map((n) => ({
          id: n.id as string,
          type: (n.type as string) ?? 'info',
          title: (n.title as string) ?? '',
          message: (n.message as string) ?? null,
          isRead: (n.is_read as boolean) ?? false,
          createdAt: n.created_at as string,
        })))
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const markAsRead = async (notifId: string): Promise<void> => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) return

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/notifications?id=eq.${notifId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ is_read: true }),
    })

    setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, isRead: true } : n))
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Notifications</h1>
      <p className="text-sm text-gray-400 mb-5">Activit&eacute; r&eacute;cente sur vos missions</p>

      {notifications.length > 0 ? (
        <div className="space-y-1.5">
          {notifications.map((n) => (
            <div key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`flex gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${n.isRead ? 'border-gray-200 bg-white' : 'border-forest-200 bg-forest-50'}`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-forest-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{n.title}</p>
                {n.message && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>}
              </div>
              <span className="text-[10px] text-gray-300 shrink-0">
                {formatRelativeDate(n.createdAt)}
              </span>
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
