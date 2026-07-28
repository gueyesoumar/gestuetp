import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMfa } from './useMfa'
import { useAuth } from '../../../hooks/useAuth'
import { MfaShell } from './MfaShell'

// Challenge à la connexion : l'utilisateur a déjà un facteur TOTP vérifié et doit
// saisir son code pour élever la session en AAL2.

export function MfaChallenge(): JSX.Element {
  const { refreshMfa, signOut } = useAuth()
  const { busy, error, verifyCode, getVerifiedTotpId } = useMfa()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')

  useEffect(() => {
    let active = true
    getVerifiedTotpId().then((id) => { if (active) setFactorId(id) })
    return () => { active = false }
  }, [getVerifiedTotpId])

  const onSubmit = async (ev: FormEvent): Promise<void> => {
    ev.preventDefault()
    if (!factorId || code.trim().length < 6) return
    const ok = await verifyCode(factorId, code.trim())
    if (ok) await refreshMfa()
  }

  return (
    <MfaShell title="Vérification en deux étapes" subtitle="Saisissez le code de votre application">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000" aria-label="Code à 6 chiffres"
          className="w-full text-center tracking-[0.4em] text-lg font-mono border border-gray-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
        />
        {error ? <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p> : null}
        <button
          type="submit" disabled={busy || !factorId || code.length < 6}
          className="w-full text-white font-semibold rounded-lg py-3 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-forest-900)' }}
        >
          {busy ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>
      <button onClick={() => { void signOut() }} className="mt-5 text-xs text-gray-400 hover:text-gray-600 w-full text-center">
        Se déconnecter
      </button>
    </MfaShell>
  )
}
