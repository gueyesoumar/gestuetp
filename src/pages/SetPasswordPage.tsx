import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
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

export function SetPasswordPage(): JSX.Element {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { policy } = usePasswordPolicy()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
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

  return (
    <VaultBackground>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-6">
          <MorphingShield size={48} />
        </div>
        <div className="mb-10">
          <VaultBranding />
        </div>

        {!sessionReady ? (
          <SetPasswordWaiting />
        ) : success ? (
          <SetPasswordSuccess />
        ) : (
          <SetPasswordForm
            password={password}
            confirm={confirm}
            error={error}
            submitting={submitting}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            onSubmit={handleSubmit}
          />
        )}
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
