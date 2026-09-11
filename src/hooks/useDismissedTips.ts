import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Astuces d'onboarding (coach-marks E5) déjà fermées par l'utilisateur courant.
 * Persistées dans user_dismissed_tips (RLS self-only, migration 00234) →
 * mémorisation cross-appareil. `dismiss` est optimiste ; `reset` alimente
 * l'option « Revoir les astuces ».
 */
export interface UseDismissedTips {
  loading: boolean
  isDismissed: (key: string) => boolean
  dismiss: (key: string) => Promise<void>
  reset: () => Promise<void>
}

export function useDismissedTips(): UseDismissedTips {
  const { profile } = useAuth()
  const uid = profile?.id ?? null
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      if (!uid) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('user_dismissed_tips')
        .select('tip_key')
        .abortSignal(controller.signal)
      if (controller.signal.aborted) return
      if (error) {
        console.error('useDismissedTips:', error.message)
        setLoading(false)
        return
      }
      setDismissed(new Set((data as { tip_key: string }[]).map((r) => r.tip_key)))
      setLoading(false)
    })()
    return () => controller.abort()
  }, [uid])

  const dismiss = useCallback(async (key: string): Promise<void> => {
    if (!uid) return
    setDismissed((prev) => new Set(prev).add(key))
    const { error } = await supabase
      .from('user_dismissed_tips')
      .insert({ user_id: uid, tip_key: key })
    // 23505 = doublon (déjà fermée dans un autre onglet) : sans gravité.
    if (error && error.code !== '23505') {
      console.error('useDismissedTips dismiss:', error.message)
    }
  }, [uid])

  const reset = useCallback(async (): Promise<void> => {
    if (!uid) return
    setDismissed(new Set())
    const { error } = await supabase
      .from('user_dismissed_tips')
      .delete()
      .eq('user_id', uid)
    if (error) console.error('useDismissedTips reset:', error.message)
  }, [uid])

  const isDismissed = useCallback((key: string): boolean => dismissed.has(key), [dismissed])

  return { loading, isDismissed, dismiss, reset }
}
