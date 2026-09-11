import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction'
import { useAuth } from '../hooks/useAuth'
import { usePasswordPolicy } from '../hooks/usePasswordPolicy'
import { checkPasswordRules } from '../lib/passwordPolicy'
import { Check } from 'lucide-react'
import { VaultBackground } from '../components/vault/VaultBackground'
import { MorphingShield } from '../components/vault/MorphingShield'
import { VaultBranding } from '../components/vault/VaultBranding'
import { SetPasswordForm } from '../components/vault/SetPasswordForm'
import { useBranding } from '../features/branding/useBranding'
import { BrandedBrandPanel } from '../features/branding/BrandedBrandPanel'
import { BrandedAuthHeader, PoweredByGestu } from '../features/branding/BrandedAuthHeader'

export function SetPasswordPage(): JSX.Element {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { branding } = useBranding()
  const { policy } = usePasswordPolicy()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    // Flux brandé : le lien de l'email est `${domaine}/set-password?token_hash=…&type=recovery`.
    // On échange le token_hash contre une session via verifyOtp (équivalent du
    // endpoint /auth/v1/verify, mais sans exposer le host supabase.co).
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    if (tokenHash && type) {
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType }).then(({ error }) => {
        if (error) {
          console.error('SetPasswordPage verifyOtp:', error.message)
          setLinkExpired(true)
          return
        }
        setSessionReady(true)
        // Retire le token de la barre d'adresse / de l'historique.
        window.history.replaceState(null, '', window.location.pathname)
      })
    } else {
      // Compat : anciens liens (hash access_token) → PASSWORD_RECOVERY / session existante.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setSessionReady(true)
      })
    }
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    const ruleErrors = checkPasswordRules(password, policy)
    if (ruleErrors.length > 0) {
      setError(ruleErrors.join(' \u00b7 '))
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    // Passe par l'edge `set-password` : validation politique c\u00f4t\u00e9 serveur + HIBP.
    const res = await invokeEdgeFunction('set-password', { password })

    if (!res.ok) {
      console.error('SetPasswordPage:', res.error)
      setError(res.error ?? 'Erreur lors de la mise \u00e0 jour. Le lien a peut-\u00eatre expir\u00e9.')
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)

    setTimeout(() => {
      const target = profile?.role === 'client' ? '/client' : '/hub'
      navigate(target, { replace: true })
    }, 2000)
  }

  const content = linkExpired ? (
    <SetPasswordExpired />
  ) : !sessionReady ? (
    <SetPasswordWaiting />
  ) : success ? (
    <SetPasswordSuccess />
  ) : (
    <SetPasswordForm
      password={password}
      confirm={confirm}
      error={error}
      submitting={submitting}
      policy={policy}
      onPasswordChange={setPassword}
      onConfirmChange={setConfirm}
      onSubmit={handleSubmit}
    />
  )

  // Domaine cabinet : split brandé (comme le login). Sinon vault Gëstu.
  if (branding) {
    return (
      <div className="flex min-h-screen flex-col lg:flex-row">
        <BrandedBrandPanel />
        <div
          className="flex flex-1 items-center justify-center px-6 py-12 lg:border-l lg:border-white/10"
          style={{ background: 'var(--color-forest-900, #0f2820)' }}
        >
          <div className="w-full max-w-sm">
            <div className="mb-9 flex justify-center lg:hidden"><BrandedAuthHeader layout="login" /></div>
            <h3 className="mb-1.5 text-[24px] font-semibold tracking-[-0.3px] text-white">Définir votre mot de passe</h3>
            <p className="mb-8 text-[13.5px] text-white/55">Choisissez un mot de passe sécurisé pour accéder à votre espace.</p>
            {content}
            <PoweredByGestu className="mt-9" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <VaultBackground>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-6">
          <MorphingShield size={48} />
        </div>
        <div className="mb-10">
          <VaultBranding />
        </div>
        {content}
      </div>
    </VaultBackground>
  )
}

function SetPasswordWaiting(): JSX.Element {
  return (
    <div className="text-center">
      <p className="text-[13px] text-white/40">
        V{'\u00e9'}rification du lien en cours...
      </p>
      <p className="mt-2 text-[11px] text-white/20">
        Si cette page reste bloqu{'\u00e9'}e, le lien a peut-{'\u00ea'}tre expir{'\u00e9'}.
      </p>
      <a
        href="/login"
        className="mt-4 inline-block text-[12px] text-[#D4A843]/60 hover:text-[#D4A843]"
      >
        Retour {'\u00e0'} la connexion
      </a>
    </div>
  )
}

function SetPasswordExpired(): JSX.Element {
  return (
    <div className="text-center">
      <p className="text-[14px] font-semibold text-white/80">Lien invalide ou expiré</p>
      <p className="mt-2 text-[12px] text-white/40">
        Ce lien a peut-être déjà été utilisé ou a expiré. Demandez-en un nouveau depuis la page de connexion.
      </p>
      <a
        href="/login"
        className="mt-4 inline-block text-[12px] text-[#D4A843]/80 hover:text-[#D4A843]"
      >
        Retour à la connexion
      </a>
    </div>
  )
}

function SetPasswordSuccess(): JSX.Element {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#40916C]/20">
        <Check size={28} className="text-[#40916C]" />
      </div>
      <p className="text-[14px] font-semibold text-white/80">
        Mot de passe d{'\u00e9'}fini !
      </p>
      <p className="mt-1 text-[12px] text-white/30">Redirection en cours...</p>
    </div>
  )
}
