import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { preAuthEdition } from '../lib/product'
import { useBranding } from '../features/branding/useBranding'
import { BrandedAuthHeader, PoweredByGestu } from '../features/branding/BrandedAuthHeader'
import { BrandedBrandPanel } from '../features/branding/BrandedBrandPanel'
import { FullscreenLoader } from '../components/FullscreenLoader'
import { consumeTenantDeniedFlag } from '../lib/tenantAccess'
import { LoginForm } from '../components/vault/LoginForm'
import { ResetForm } from '../components/vault/ResetForm'
import { VaultBrandPanel, ShieldMark } from '../components/vault/VaultBrandPanel'

export function LoginPage(): JSX.Element {
  const { session, loading, signIn, profile } = useAuth()
  const { branding, loading: brandingLoading } = useBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [tenantDenied] = useState(() => consumeTenantDeniedFlag())

  // On bloque sur l'auth (session à résoudre) et sur le branding UNIQUEMENT s'il
  // est encore inconnu : quand il vient du cache, on rend le split brandé
  // immédiatement (revalidation en arrière-plan), sans flash de loader sombre.
  if (loading || (brandingLoading && !branding)) {
    return <FullscreenLoader />
  }

  if (session) {
    // Regul : assujetti (role=client) → portail cloisonné, staff → tableau de bord.
    // Comply : platform owner → /admin, autres → /hub.
    const target = preAuthEdition() === 'regul'
      ? (profile?.role === 'client' ? '/client' : '/')
      : (profile?.is_platform_owner ? '/admin' : '/hub')
    return <Navigate to={target} replace />
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: authError } = await signIn(email, password)
    if (authError) {
      setError('Identifiants incorrects. Veuillez réessayer.')
      setSubmitting(false)
    }
  }

  const handleReset = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setResetSubmitting(true)
    // Message neutre quel que soit le résultat (anti-énumération de comptes).
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/set-password`,
    })
    if (resetError) console.error('resetPasswordForEmail:', resetError.message)
    setResetSubmitting(false)
    setResetSent(true)
  }

  const goReset = (): void => { setMode('reset'); setError(null) }
  const goLogin = (): void => { setMode('login'); setResetSent(false); setResetEmail('') }

  const isBranded = Boolean(branding)

  const deniedBanner = tenantDenied ? (
    <div className="mb-5 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] text-amber-200">
      Ce compte n&apos;appartient pas à ce portail. Utilisez le portail de votre organisation.
    </div>
  ) : null

  const formArea = mode === 'reset' ? (
    <ResetForm
      email={resetEmail}
      submitting={resetSubmitting}
      sent={resetSent}
      onEmailChange={setResetEmail}
      onSubmit={handleReset}
      onBack={goLogin}
    />
  ) : (
    <LoginForm
      email={email}
      password={password}
      error={error}
      submitting={submitting}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      onForgot={goReset}
    />
  )

  if (isBranded) {
    // Split brandé : panneau récit cabinet (adaptatif light/dark, logo posé tel
    // quel) à gauche + formulaire sur panneau sombre à droite (LoginForm inchangé).
    return (
      <div className="flex min-h-screen flex-col lg:flex-row">
        <BrandedBrandPanel />
        <div
          className="flex flex-1 items-center justify-center px-6 py-12 lg:border-l lg:border-white/10"
          style={{ background: 'var(--color-forest-900, #0f2820)' }}
        >
          <div className="w-full max-w-sm">
            <div className="mb-9 flex justify-center lg:hidden"><BrandedAuthHeader layout="login" /></div>
            <h3 className="mb-1.5 text-[24px] font-semibold tracking-[-0.3px] text-white">
              {mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'}
            </h3>
            {mode === 'login' && (
              <p className="mb-8 text-[13.5px] text-white/55">Accédez à votre espace.</p>
            )}
            {mode === 'reset' && <div className="mb-6" />}
            {deniedBanner}
            {formArea}
            <PoweredByGestu className="mt-9" />
          </div>
        </div>
      </div>
    )
  }

  // Direction « Split souverain » (édition Gëstu).
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <VaultBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-[#0f2820] px-6 py-12 lg:border-l lg:border-[#D4A843]/[0.14]">
        <div className="w-full max-w-sm">
          <div className="mb-9 flex items-center gap-2.5 lg:hidden">
            <ShieldMark size={26} />
            <span className="text-[17px] font-normal tracking-[4px] text-white">GËSTU<span className="ml-1 text-[#D4A843]">ETP</span></span>
          </div>
          <h3 className="mb-1.5 text-[24px] font-semibold tracking-[-0.3px] text-white">
            {mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'}
          </h3>
          {mode === 'login' && (
            <p className="mb-8 text-[13.5px] text-white/55">Accédez à votre espace de supervision.</p>
          )}
          {mode === 'reset' && <div className="mb-6" />}
          {deniedBanner}
          {formArea}
          <p className="mt-9 text-center text-[11px] text-white/30">
            Plateforme Gëstu ETP — accès réservé aux comptes autorisés.
          </p>
        </div>
      </div>
    </div>
  )
}
