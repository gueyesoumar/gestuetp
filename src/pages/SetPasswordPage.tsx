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

/** Lit le token_hash/type de l'URL (lien d'invitation brandé). null si absent. */
function readUrlToken(): { tokenHash: string; type: EmailOtpType } | null {
  const params = new URLSearchParams(window.location.search)
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  return tokenHash && type ? { tokenHash, type: type as EmailOtpType } : null
}

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
  // Flux brandé : le lien de l'email est `${domaine}/set-password?token_hash=…&type=recovery`.
  // IMPORTANT : on NE consomme PAS le token au chargement. Le jeton de récupération
  // est à usage unique, et les scanners de messagerie d'entreprise (Microsoft
  // Defender / Safe Links…) pré-visitent le lien — un verifyOtp au chargement
  // l'invaliderait avant le clic humain (« lien invalide ou expiré »). On lit le
  // token ici (init) pour afficher le formulaire, et on l'échange seulement à la
  // SOUMISSION (geste humain délibéré) — voir handleSubmit.
  const [pendingToken, setPendingToken] = useState<{ tokenHash: string; type: EmailOtpType } | null>(readUrlToken)
  const [sessionReady, setSessionReady] = useState<boolean>(() => readUrlToken() !== null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })
    // Compat : anciens liens (hash access_token) → PASSWORD_RECOVERY / session existante.
    if (readUrlToken() === null) {
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

    // \u00c9change du token SEULEMENT maintenant (geste humain) : ouvre la session de
    // r\u00e9cup\u00e9ration juste avant de poser le mot de passe. R\u00e9silient aux scanners.
    if (pendingToken) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: pendingToken.tokenHash,
        type: pendingToken.type,
      })
      if (otpError) {
        console.error('SetPasswordPage verifyOtp:', otpError.message)
        setError('Ce lien est invalide ou a expir\u00e9. Demandez un nouveau lien \u00e0 votre administrateur.')
        setSubmitting(false)
        return
      }
      setPendingToken(null)
      // Retire le token de la barre d'adresse / de l'historique.
      window.history.replaceState(null, '', window.location.pathname)
    }

    // Email courant (session recovery encore valide) pour la r\u00e9-authentification.
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const email = authUser?.email ?? null

    // Passe par l'edge `set-password` : validation politique c\u00f4t\u00e9 serveur + HIBP.
    const res = await invokeEdgeFunction('set-password', { password })

    if (!res.ok) {
      console.error('SetPasswordPage:', res.error)
      setError(res.error ?? 'Erreur lors de la mise \u00e0 jour. Le lien a peut-\u00eatre expir\u00e9.')
      setSubmitting(false)
      return
    }

    // Le changement de mot de passe (Admin API) r\u00e9voque la session \u00ab recovery \u00bb :
    // on r\u00e9-authentifie avec le nouveau mot de passe pour repartir sur une session
    // propre \u2014 sinon l'app se d\u00e9connecte au 1er rafra\u00eechissement de token.
    if (email) {
      const { error: reSignError } = await supabase.auth.signInWithPassword({ email, password })
      if (reSignError) console.error('SetPasswordPage re-signin:', reSignError.message)
    }

    setSuccess(true)
    setSubmitting(false)

    setTimeout(() => {
      const target = profile?.role === 'client' ? '/client' : '/hub'
      navigate(target, { replace: true })
    }, 2000)
  }

  const content = !sessionReady ? (
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
