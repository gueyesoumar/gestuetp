import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { GestuLogo } from '../components/GestuLogo'

export function SetPasswordPage(): JSX.Element {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase Auth d&eacute;tecte le token recovery dans l'URL et cr&eacute;e une session automatiquement
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })
    // V&eacute;rifier si d&eacute;j&agrave; en session (page recharg&eacute;e)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caract\u00e8res.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      console.error('SetPasswordPage:', updateError.message)
      setError('Erreur lors de la mise \u00e0 jour du mot de passe. Le lien a peut-\u00eatre expir\u00e9.')
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)

    // Rediriger selon le r&ocirc;le apr&egrave;s 2 secondes
    setTimeout(() => {
      if (profile?.role === 'client') {
        navigate('/client', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }, 2000)
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-900 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">
          <GestuLogo size="md" variant="light" product="comply" />
          <p className="mt-6 text-sm text-gray-500">V{'\u00e9'}rification du lien en cours...</p>
          <p className="mt-2 text-xs text-gray-300">Si cette page reste bloqu{'\u00e9'}e, le lien a peut-{'\u00ea'}tre expir{'\u00e9'}.</p>
          <a href="/login" className="mt-4 inline-block text-xs text-forest-700 hover:underline">
            Retour {'\u00e0'} la connexion
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest-900 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center">
            <GestuLogo size="md" variant="light" product="comply" />
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                <span className="text-2xl text-green-600">{'\u2713'}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Mot de passe d{'\u00e9'}fini !</p>
              <p className="text-xs text-gray-400">Redirection en cours...</p>
            </div>
          ) : (
            <>
              <p className="mb-1 text-center text-sm font-semibold text-gray-900">
                D{'\u00e9'}finissez votre mot de passe
              </p>
              <p className="mb-6 text-center text-xs text-gray-400">
                Bienvenue sur le portail G{'\u00eb'}stu Comply
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="new-password" className="block text-xs font-medium text-gray-700">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
                    placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    minLength={8}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
                    placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    minLength={8}
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-900 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement...' : 'D\u00e9finir mon mot de passe'}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-[11px] text-gray-300">
            Propuls{'\u00e9'} par G{'\u00eb'}stu Group
          </p>
        </div>
      </div>
    </div>
  )
}
