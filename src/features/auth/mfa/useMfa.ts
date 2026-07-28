import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// Encapsule les appels MFA de Supabase (TOTP). Le secret n'existe que côté
// Supabase (gotrue) ; on ne manipule ici que des identifiants de facteur.

export interface TotpEnrollment {
  factorId: string
  uri: string
  secret: string
}

export interface UseMfa {
  busy: boolean
  error: string | null
  enrollTotp: () => Promise<TotpEnrollment | null>
  verifyCode: (factorId: string, code: string) => Promise<boolean>
  getVerifiedTotpId: () => Promise<string | null>
}

export function useMfa(): UseMfa {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enrollTotp = useCallback(async (): Promise<TotpEnrollment | null> => {
    setError(null); setBusy(true)
    try {
      // Purge d'un éventuel facteur TOTP non vérifié (sinon collision de nom).
      const { data: list } = await supabase.auth.mfa.listFactors()
      const stale = (list?.all ?? []).filter((f) => f.factor_type === 'totp' && f.status === 'unverified')
      for (const f of stale) await supabase.auth.mfa.unenroll({ factorId: f.id })

      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator' })
      if (err || !data) {
        console.error('MFA enroll:', err?.message ?? 'inconnu')
        setError('Impossible de démarrer la configuration. Réessayez.')
        return null
      }
      return { factorId: data.id, uri: data.totp.uri, secret: data.totp.secret }
    } catch (e) {
      console.error('MFA enroll:', e instanceof Error ? e.message : String(e))
      setError('Une erreur est survenue. Réessayez.')
      return null
    } finally { setBusy(false) }
  }, [])

  const verifyCode = useCallback(async (factorId: string, code: string): Promise<boolean> => {
    setError(null); setBusy(true)
    try {
      const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId })
      if (e1 || !ch) {
        console.error('MFA challenge:', e1?.message ?? 'inconnu')
        setError('Vérification indisponible. Réessayez.')
        return false
      }
      const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code })
      if (e2) { setError('Code invalide ou expiré.'); return false }
      return true
    } catch (e) {
      console.error('MFA verify:', e instanceof Error ? e.message : String(e))
      setError('Une erreur est survenue. Réessayez.')
      return false
    } finally { setBusy(false) }
  }, [])

  const getVerifiedTotpId = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.mfa.listFactors()
    return (data?.totp ?? [])[0]?.id ?? null
  }, [])

  return { busy, error, enrollTotp, verifyCode, getVerifiedTotpId }
}
