import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMfa } from './useMfa'
import type { TotpEnrollment } from './useMfa'
import { useAuth } from '../../../hooks/useAuth'
import { MfaShell } from './MfaShell'

// Enrôlement TOTP forcé : affiché quand la MFA est obligatoire et qu'aucun
// facteur vérifié n'existe. Bloque l'accès tant que le facteur n'est pas confirmé.

export function MfaEnrollment(): JSX.Element {
  const { refreshMfa, signOut } = useAuth()
  const { busy, error, enrollTotp, verifyCode } = useMfa()
  const [enroll, setEnroll] = useState<TotpEnrollment | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [code, setCode] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    enrollTotp().then((e) => { if (e) setEnroll(e); else setLoadErr(true) })
  }, [enrollTotp])

  const onSubmit = async (ev: FormEvent): Promise<void> => {
    ev.preventDefault()
    if (!enroll || code.trim().length < 6) return
    const ok = await verifyCode(enroll.factorId, code.trim())
    if (ok) await refreshMfa()
  }

  return (
    <MfaShell title="Sécurisez votre compte" subtitle="Authentification à deux facteurs requise">
      {loadErr ? (
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>
          Configuration indisponible pour le moment. Rechargez la page ou réessayez plus tard.
        </p>
      ) : !enroll ? (
        <p className="text-sm text-gray-500">Préparation en cours&hellip;</p>
      ) : (
        <>
          <ol className="text-sm text-gray-600 space-y-1 mb-4 list-decimal list-inside">
            <li>Ouvrez votre application d&apos;authentification (Google Authenticator, Microsoft Authenticator, Authy&hellip;).</li>
            <li>Scannez ce QR code, puis saisissez le code à 6 chiffres généré.</li>
          </ol>
          <div className="flex justify-center mb-4">
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(enroll.qrCodeSvg)}`}
              alt="QR code de configuration TOTP"
              className="w-44 h-44 rounded-lg border border-gray-200 bg-white p-2"
            />
          </div>
          <details className="mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer">Impossible de scanner&nbsp;? Saisie manuelle</summary>
            <code className="block mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-2 break-all">{enroll.secret}</code>
          </details>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000" aria-label="Code à 6 chiffres"
              className="w-full text-center tracking-[0.4em] text-lg font-mono border border-gray-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            />
            {error ? <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p> : null}
            <button
              type="submit" disabled={busy || code.length < 6}
              className="w-full text-white font-semibold rounded-lg py-3 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-forest-900)' }}
            >
              {busy ? 'Vérification…' : 'Activer et continuer'}
            </button>
          </form>
        </>
      )}
      <button onClick={() => { void signOut() }} className="mt-5 text-xs text-gray-400 hover:text-gray-600 w-full text-center">
        Se déconnecter
      </button>
    </MfaShell>
  )
}
