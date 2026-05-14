import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Notification } from '../../types/database.types'

interface UseNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => void
}

export function useNotifications(): UseNotificationsResult {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useNotifications:', queryError.message)
          setError('Impossible de charger les notifications.')
        } else {
          setNotifications(data ?? [])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [profile, refreshKey])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = useCallback(async (id: string) => {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('id', id)

    if (!updateError) {
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
      )
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!profile) return
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('user_id', profile.id)
      .eq('is_read', false)

    if (!updateError) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      )
    }
  }, [profile])

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refetch }
}
