import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Notification } from '../../types/database.types'

export interface UseNotificationsResult {
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

  // Temps réel (RFC n°17 Lot 2) : la RLS + le filtre user_id garantissent qu'on ne
  // reçoit que ses propres notifications. INSERT => ajout en tête ; UPDATE => remplace.
  useEffect(() => {
    if (!profile) return
    const uid = profile.id
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, (payload) => {
        const n = payload.new as Notification
        setNotifications((prev) => prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 50))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, (payload) => {
        const n = payload.new as Notification
        setNotifications((prev) => prev.map((x) => x.id === n.id ? n : x))
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [profile])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = useCallback(async (id: string) => {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('id', id)

    if (updateError) {
      console.error('[useNotifications] markAsRead:', updateError.message)
      return
    }
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!profile) return
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('user_id', profile.id)
      .eq('is_read', false)

    if (updateError) {
      console.error('[useNotifications] markAllAsRead:', updateError.message)
      return
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    )
  }, [profile])

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refetch }
}
