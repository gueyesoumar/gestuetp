import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { preAuthEdition } from '../../../lib/product'

// Nom affiché comme émetteur dans l'app d'authentification (au lieu de la Site URL
// par défaut de gotrue). Le produit est Gëstu ETP (Comply n'est qu'un module) ;
// l'édition régulateur est brandée Gëstu Regul (résolue par hostname/env pré-auth).
const MFA_ISSUER = preAuthEdition() === 'regul' ? 'Gëstu Regul' : 'Gëstu ETP'

// Encapsule les appels MFA de Supabase (TOTP). Le secret n'existe que côté
// Supabase (gotrue) ; on ne manipule ici que des identifiants de facteur.

export interface TotpEnrollment {
  factorId: string
  uri: string
  secret: string
}

export interface TotpFactor {
  id: string
  friendlyName: string
  createdAt: string
}

export interface UseMfa {
  busy: boolean
  error: string | null
  enrollTotp: (friendlyName?: string) => Promise<TotpEnrollment | null>
  verifyCode: (factorId: string, code: string) => Promise<boolean>
  getVerifiedTotpId: () => Promise<string | null>
  listTotpFactors: () => Promise<TotpFactor[]>
  removeFactor: (factorId: string, code: string) => Promise<boolean>
}

// Prouve la possession d'un facteur conservé en vérifiant un code TOTP frais
// contre l'un d'eux (step-up avant retrait). Seul le facteur dont le secret
// génère ce code réussit ; les autres échouent silencieusement.
async function proveControl(factors: TotpFactor[], code: string): Promise<boolean> {
  for (const f of factors) {
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: f.id })
    if (e1 || !ch) continue
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: f.id, challengeId: ch.id, code })
    if (!e2) return true
  }
  return false
}

export function useMfa(): UseMfa {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enrollTotp = useCallback(async (friendlyName = 'Authenticator'): Promise<TotpEnrollment | null> => {
    setError(null); setBusy(true)
    try {
      // Purge d'un éventuel facteur TOTP non vérifié (sinon collision de nom).
      const { data: list } = await supabase.auth.mfa.listFactors()
      const stale = (list?.all ?? []).filter((f) => f.factor_type === 'totp' && f.status === 'unverified')
      for (const f of stale) await supabase.auth.mfa.unenroll({ factorId: f.id })

      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName, issuer: MFA_ISSUER })
      if (err || !data) {
        console.error('MFA enroll:', err?.message ?? 'inconnu')
        // Nom déjà pris (gotrue impose l'unicité) → message dédié.
        const dup = /already exists|friendly.?name/i.test(err?.message ?? '')
        setError(dup ? 'Ce nom est déjà utilisé. Choisissez-en un autre.' : 'Impossible de démarrer la configuration. Réessayez.')
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

  const listTotpFactors = useCallback(async (): Promise<TotpFactor[]> => {
    const { data, error: err } = await supabase.auth.mfa.listFactors()
    if (err || !data) {
      console.error('MFA list:', err?.message ?? 'inconnu')
      return []
    }
    return (data.totp ?? []).map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name ?? 'Authentificateur',
      createdAt: f.created_at,
    }))
  }, [])

  const removeFactor = useCallback(async (factorId: string, code: string): Promise<boolean> => {
    setError(null); setBusy(true)
    try {
      const { data: list } = await supabase.auth.mfa.listFactors()
      const verified: TotpFactor[] = (list?.totp ?? []).map((f) => ({
        id: f.id, friendlyName: f.friendly_name ?? 'Authentificateur', createdAt: f.created_at,
      }))
      // Invariant « MFA obligatoire » : jamais retirer le dernier facteur vérifié.
      if (verified.length <= 1) {
        setError('Vous devez conserver au moins un authentificateur. Ajoutez-en un autre avant de retirer celui-ci.')
        return false
      }
      // Step-up : prouver la possession d'un facteur CONSERVÉ (jamais celui retiré).
      const kept = verified.filter((f) => f.id !== factorId)
      const proven = await proveControl(kept, code)
      if (!proven) { setError('Code invalide ou expiré.'); return false }

      const { error: err } = await supabase.auth.mfa.unenroll({ factorId })
      if (err) {
        console.error('MFA unenroll:', err.message)
        setError('Impossible de retirer cet authentificateur. Réessayez.')
        return false
      }
      return true
    } catch (e) {
      console.error('MFA remove:', e instanceof Error ? e.message : String(e))
      setError('Une erreur est survenue. Réessayez.')
      return false
    } finally { setBusy(false) }
  }, [])

  return { busy, error, enrollTotp, verifyCode, getVerifiedTotpId, listTotpFactors, removeFactor }
}
