import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { NotificationType } from '../../types/database.types'

interface UseNotificationPreferencesResult {
  isEnabled: (type: NotificationType) => boolean
  toggle: (type: NotificationType) => Promise<void>
  loading: boolean
  saving: boolean
}

/** Préférences in-app par type (RFC n°17 Lot 4). muted_types = types désactivés ;
 *  absence de ligne = tout activé. Upsert sur notification_preferences (RLS self). */
export function useNotificationPreferences(userId: string | undefined): UseNotificationPreferencesResult {
  const [muted, setMuted] = useState<NotificationType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    supabase
      .from('notification_preferences')
      .select('muted_types')
      .eq('user_id', userId)
      .abortSignal(ac.signal)
      .maybeSingle()
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) console.error('useNotificationPreferences:', error.message)
        setMuted(((data?.muted_types as NotificationType[] | undefined) ?? []))
        setLoading(false)
      })
    return () => ac.abort()
  }, [userId])

  const isEnabled = useCallback((type: NotificationType) => !muted.includes(type), [muted])

  const toggle = useCallback(async (type: NotificationType) => {
    if (!userId) return
    const prev = muted
    const next = muted.includes(type) ? muted.filter((t) => t !== type) : [...muted, type]
    setMuted(next)
    setSaving(true)
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, muted_types: next, updated_at: new Date().toISOString() } as never)
    setSaving(false)
    if (error) { console.error('useNotificationPreferences toggle:', error.message); setMuted(prev) }
  }, [userId, muted])

  return { isEnabled, toggle, loading, saving }
}
