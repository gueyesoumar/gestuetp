import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

interface Prefs {
  reminders_enabled: boolean
  digest_enabled: boolean
  email_masked: string
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-preferences`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Lien invalide. Aucun token fourni.')
      setLoading(false)
      return
    }

    const abort = new AbortController()
    fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action: 'get', token }),
      signal: abort.signal,
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
        setPrefs(data)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message ?? 'Erreur inconnue')
      })
      .finally(() => setLoading(false))

    return () => abort.abort()
  }, [token])

  const update = async (changes: Partial<Pick<Prefs, 'reminders_enabled' | 'digest_enabled'>>) => {
    if (!prefs || !token) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ action: 'update', token, ...changes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      setPrefs({ ...prefs, ...data })
      setConfirmed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Centered><LoadingSpinner /></Centered>
  if (error && !prefs) {
    return (
      <Centered>
        <BrandHeader />
        <h2 className="text-xl font-bold text-forest-900 mt-4">Lien invalide</h2>
        <p className="mt-2 text-[13px] text-gray-500 max-w-md">{error}</p>
      </Centered>
    )
  }
  if (!prefs) return null

  const allOff = !prefs.reminders_enabled && !prefs.digest_enabled

  return (
    <Centered>
      <BrandHeader />
      {confirmed && allOff ? (
        <SuccessMessage email={prefs.email_masked} />
      ) : (
        <>
          <h2 className="text-xl font-bold text-forest-900 mt-4">
            {confirmed ? 'C’est noté' : 'Préférences email'}
          </h2>
          <p className="mt-2 text-[13px] text-gray-500 max-w-md">
            {confirmed
              ? 'Vos préférences ont été enregistrées. Vous pouvez réactiver à tout moment.'
              : 'Ajustez vos préférences. Les changements sont appliqués immédiatement.'}
          </p>
        </>
      )}

      <div className="mt-6 w-full max-w-lg bg-white border border-gray-200 rounded-xl overflow-hidden">
        <PrefRow
          label="Relances de demandes de preuves"
          description="Rappels automatiques à J+3, J+7 et J+14 pour les documents en attente."
          enabled={prefs.reminders_enabled}
          disabled={saving}
          onToggle={(v) => void update({ reminders_enabled: v })}
        />
        <PrefRow
          label="Résumé hebdomadaire"
          description="Lundi matin, ce qui vous attend cette semaine sur vos missions."
          enabled={prefs.digest_enabled}
          disabled={saving}
          onToggle={(v) => void update({ digest_enabled: v })}
        />
      </div>

      <p className="mt-6 text-[11px] text-gray-400">
        Email associé&nbsp;: <span className="font-mono text-gray-700">{prefs.email_masked}</span>
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600">{error}</p>
      )}
    </Centered>
  )
}

function PrefRow({
  label,
  description,
  enabled,
  disabled,
  onToggle,
}: {
  label: string
  description: string
  enabled: boolean
  disabled: boolean
  onToggle: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-4 border-b border-gray-200 last:border-b-0">
      <div className="text-left">
        <div className="text-[13.5px] font-semibold text-gray-900">{label}</div>
        <div className="text-[12px] text-gray-500 mt-1 leading-relaxed">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        disabled={disabled}
        aria-label={`${enabled ? 'Désactiver' : 'Activer'} : ${label}`}
        aria-pressed={enabled}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-forest-700' : 'bg-gray-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${
            enabled ? 'left-[22px]' : 'left-[2px]'
          }`}
        />
      </button>
    </div>
  )
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center text-forest-900 font-black">G</div>
      <div className="text-left">
        <div className="font-extrabold text-forest-900 text-[15px]">G<span className="text-gold-500">ë</span>stu</div>
        <div className="text-[10px] uppercase tracking-wider text-gold-600 font-semibold">Comply</div>
      </div>
    </div>
  )
}

function SuccessMessage({ email }: { email: string }) {
  return (
    <>
      <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-success text-2xl font-bold mt-4">
        ✓
      </div>
      <h2 className="text-xl font-bold text-forest-900 mt-4">C&apos;est noté</h2>
      <p className="mt-2 text-[13px] text-gray-500 max-w-md">
        Vous ne recevrez plus de relances automatiques sur <span className="font-mono">{email}</span>. Vous continuerez à recevoir
        les emails opérationnels essentiels.
      </p>
    </>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4 py-10">
      <div className="flex flex-col items-center text-center max-w-2xl w-full">{children}</div>
    </div>
  )
}
