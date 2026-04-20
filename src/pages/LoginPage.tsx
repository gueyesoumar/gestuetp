import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { VaultBackground } from '../components/vault/VaultBackground'
import { LoginForm } from '../components/vault/LoginForm'
import { MorphingShield } from '../components/vault/MorphingShield'
import { VaultBranding } from '../components/vault/VaultBranding'
import { TrustBadges } from '../components/vault/TrustBadges'

export function LoginPage(): JSX.Element {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <VaultBackground>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-white/30">Chargement...</p>
        </div>
      </VaultBackground>
    )
  }

  if (session) {
    return <Navigate to="/hub" replace />
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: authError } = await signIn(email, password)

    if (authError) {
      setError('Identifiants incorrects. Veuillez r\u00e9essayer.')
      setSubmitting(false)
    }
  }

  return (
    <VaultBackground>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <MorphingShield size={56} />
        </div>

        <div className="mb-10">
          <VaultBranding />
        </div>

        <LoginForm
          email={email}
          password={password}
          error={error}
          submitting={submitting}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
        />

        <div className="mt-16">
          <TrustBadges />
        </div>
      </div>
    </VaultBackground>
  )
}
