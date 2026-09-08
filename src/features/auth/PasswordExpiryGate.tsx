import { useState, type ReactNode, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy'
import { checkPasswordRules, describePasswordPolicy } from '../../lib/passwordPolicy'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'

// Barrière de rotation : montée sous MfaGate. Si la rotation est active et le mot
// de passe expiré, l'accès est bloqué jusqu'au changement (contrôle de conformité).
const EXEMPT_PREFIXES = ['/login', '/set-password', '/unsubscribe']

function isExpired(changedAt: string | null, rotationDays: number | null): boolean {
  if (rotationDays == null) return false
  if (!changedAt) return true
  return Date.now() - new Date(changedAt).getTime() > rotationDays * 86_400_000
}

export function PasswordExpiryGate({ children }: { children: ReactNode }): JSX.Element {
  const { session, profile } = useAuth()
  const { policy, loading } = usePasswordPolicy()
  const { pathname } = useLocation()

  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p)) || !session) return <>{children}</>
  if (loading || !profile) return <>{children}</>
  if (!isExpired(profile.password_changed_at, policy.rotation_days)) return <>{children}</>

  return <ForcedPasswordChange />
}

function ForcedPasswordChange(): JSX.Element {
  const { policy } = usePasswordPolicy()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    const ruleErrors = checkPasswordRules(password, policy)
    if (ruleErrors.length > 0) { setError(ruleErrors.join(' · ')); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setSubmitting(true)
    const res = await invokeEdgeFunction('set-password', { password })
    if (!res.ok) {
      setError(res.error ?? 'Impossible de mettre à jour le mot de passe.')
      setSubmitting(false)
      return
    }
    // Le profil (password_changed_at) est rafraîchi au rechargement → le gate se lève.
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1B4332] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-[17px] font-semibold text-gray-900">Mot de passe expiré</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
          Par mesure de sécurité, votre mot de passe doit être renouvelé pour continuer.
        </p>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Nouveau mot de passe" autoComplete="new-password" required
          className="mt-5 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px]" />
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirmer" autoComplete="new-password" required
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px]" />
        <p className="mt-2 text-[11px] text-gray-400">Requis : {describePasswordPolicy(policy).join(', ')}.</p>
        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}
        <button type="submit" disabled={submitting}
          className="mt-5 w-full rounded-lg bg-[#1B4332] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
          {submitting ? 'Mise à jour…' : 'Définir le nouveau mot de passe'}
        </button>
      </form>
    </div>
  )
}
