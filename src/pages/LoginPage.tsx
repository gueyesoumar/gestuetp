import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { preAuthEdition } from '../lib/product'
import { useBranding } from '../features/branding/useBranding'
import { BrandedAuthHeader, PoweredByGestu } from '../features/branding/BrandedAuthHeader'
import { VaultBackground } from '../components/vault/VaultBackground'
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

  if (loading || brandingLoading) {
    return (
      <VaultBackground>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-white/30">Chargement&hellip;</p>
        </div>
      </VaultBackground>
    )
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
    // Surface claire : page claire (le logo à traits foncés s'y pose tel quel,
    // transparent, sans pastille) + carte de formulaire sombre (LoginForm inchangé).
    if (branding?.brand_surface_mode === 'light') {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
          style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, color-mix(in srgb, var(--brand-primary) 8%, #FFFFFF) 100%)' }}
        >
          <div className="mb-10"><BrandedAuthHeader layout="login" /></div>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.45)]" style={{ background: 'var(--color-forest-900, #10201b)' }}>
            {formArea}
          </div>
          <PoweredByGestu className="mt-10" />
        </div>
      )
    }
    return (
      <VaultBackground>
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <div className="mb-10"><BrandedAuthHeader layout="login" /></div>
          {formArea}
          <PoweredByGestu className="mt-12" />
        </div>
      </VaultBackground>
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
          {formArea}
          <p className="mt-9 text-center text-[11px] text-white/30">
            Plateforme Gëstu ETP — accès réservé aux comptes autorisés.
          </p>
        </div>
      </div>
    </div>
  )
}
