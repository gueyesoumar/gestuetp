import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from '../lib/passwordPolicy'

const POLICY_COLUMNS =
  'min_length, require_upper, require_lower, require_digit, require_symbol, min_unique, forbid_common, check_hibp, rotation_days, history_count'

/**
 * Charge la politique de mot de passe (singleton) pour la validation UX.
 * Retombe sur les défauts best-practice si indisponible — l'enforcement fait
 * autorité côté serveur (edge `set-password`).
 */
export function usePasswordPolicy(): { policy: PasswordPolicy; loading: boolean } {
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const { data, error } = await supabase
        .from('platform_password_policy')
        .select(POLICY_COLUMNS)
        .eq('id', 1)
        .abortSignal(controller.signal)
        .single()
      if (controller.signal.aborted) return
      if (error) {
        console.error('usePasswordPolicy:', error.message)
        setLoading(false)
        return
      }
      setPolicy(data as unknown as PasswordPolicy)
      setLoading(false)
    })()
    return () => controller.abort()
  }, [])

  return { policy, loading }
}
