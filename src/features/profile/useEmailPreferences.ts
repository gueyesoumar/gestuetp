import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface EmailPreferences {
  reminders_enabled: boolean
  digest_enabled: boolean
}

interface UseEmailPreferencesResult {
  preferences: EmailPreferences | null
  loading: boolean
  error: string | null
  saving: boolean
  update: (changes: Partial<EmailPreferences>) => Promise<boolean>
}

export function useEmailPreferences(userId: string | undefined): UseEmailPreferencesResult {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    const abort = new AbortController()
    setLoading(true)
    supabase
      .from('email_preferences')
      .select('reminders_enabled, digest_enabled')
      .eq('user_id', userId)
      .abortSignal(abort.signal)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (abort.signal.aborted) return
        if (queryError) {
          console.error('useEmailPreferences:', queryError.message)
          setError('Impossible de charger les préférences.')
        } else if (data) {
          setPreferences(data as EmailPreferences)
        } else {
          // Pas de ligne — fallback aux valeurs par défaut
          setPreferences({ reminders_enabled: true, digest_enabled: false })
        }
        setLoading(false)
      })
    return () => abort.abort()
  }, [userId])

  const update = useCallback(async (changes: Partial<EmailPreferences>): Promise<boolean> => {
    if (!userId || !preferences) return false
    setSaving(true)
    setError(null)
    const next = { ...preferences, ...changes }
    // Cast: Supabase types resolve to `never` for tables introduced in a recent migration.
    const { error: updateError } = await (supabase
      .from('email_preferences') as unknown as { update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } })
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (updateError) {
      console.error('useEmailPreferences update:', updateError.message)
      setError('Mise à jour impossible.')
      setSaving(false)
      return false
    }
    setPreferences(next)
    setSaving(false)
    return true
  }, [userId, preferences])

  return { preferences, loading, error, saving, update }
}
