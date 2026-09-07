import { useEffect, useRef, useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { useMfa } from './useMfa'
import { useAuth } from '../../../hooks/useAuth'
import { MfaShell } from './MfaShell'
import { OtpInput } from '../../../components/ui/OtpInput'

// Challenge à la connexion : l'utilisateur a déjà un facteur TOTP vérifié et doit
// saisir son code pour élever la session en AAL2. Le code se soumet
// automatiquement dès les 6 chiffres saisis ; sur erreur il est vidé et refocalisé.

export function MfaChallenge(): JSX.Element {
  const { refreshMfa, signOut, profile, session } = useAuth()
  const { busy, error, verifyCode, getVerifiedTotpId } = useMfa()
  const account = profile?.email ?? session?.user?.email ?? null
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [attempt, setAttempt] = useState(0)
  const verifyingRef = useRef(false)

  useEffect(() => {
    let active = true
    getVerifiedTotpId().then((id) => { if (active) setFactorId(id) })
    return () => { active = false }
  }, [getVerifiedTotpId])

  const submit = useCallback(async (theCode: string): Promise<void> => {
    if (verifyingRef.current || !factorId || theCode.length < 6) return
    verifyingRef.current = true
    const ok = await verifyCode(factorId, theCode)
    verifyingRef.current = false
    if (ok) await refreshMfa()
    else { setCode(''); setAttempt((a) => a + 1) }
  }, [factorId, verifyCode, refreshMfa])

  // Si le facteur se charge après que le code est déjà complet, on soumet.
  useEffect(() => {
    if (factorId && code.length === 6) void submit(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factorId])

  const onSubmit = (e: FormEvent): void => { e.preventDefault(); void submit(code) }

  return (
    <MfaShell title="Vérification en deux étapes" subtitle="Saisissez le code de votre application">
      {account && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-500">
          <span className="text-gray-400">Compte&nbsp;:</span>
          <span className="truncate font-medium text-gray-700">{account}</span>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <OtpInput key={attempt} value={code} onChange={setCode} onComplete={submit} disabled={busy} autoFocus invalid={!!error} />
        {error ? <p className="text-center text-sm" style={{ color: 'var(--color-error)' }}>{error}</p> : null}
        <button
          type="submit" disabled={busy || !factorId || code.length < 6}
          className="w-full rounded-lg py-3 font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-forest-900)' }}
        >
          {busy ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>
      <button onClick={() => { void signOut() }} className="mt-5 w-full text-center text-xs text-gray-400 hover:text-gray-600">
        Se déconnecter
      </button>
    </MfaShell>
  )
}
