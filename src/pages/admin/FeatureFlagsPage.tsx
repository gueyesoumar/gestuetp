import { useState } from 'react'
import { useFeatureFlags, type FeatureFlag } from '../../features/admin/useFeatureFlags'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'

export function FeatureFlagsPage() {
  const { flags, loading, error, toggle } = useFeatureFlags()
  const [pending, setPending] = useState<{ flag: FeatureFlag; nextEnabled: boolean } | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const submit = async () => {
    if (!pending || !reason.trim()) return
    setSubmitting(true)
    const ok = await toggle(pending.flag.slug, pending.nextEnabled, reason)
    setSubmitting(false)
    if (ok) {
      toast.success(pending.nextEnabled ? 'Flag activé' : 'Flag désactivé', { description: pending.flag.name })
      setPending(null)
      setReason('')
    } else {
      toast.error('Mise à jour impossible')
    }
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Feature flags</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Feature flags</h1>
      <p className="text-[12.5px] text-gray-500 mb-5">Activation/désactivation globale des fonctionnalités produit sans redéploiement. Phase 2 = global on/off.</p>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : flags.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucun feature flag enregistré.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {flags.map((f, i) => (
            <div key={f.id} className={`flex items-start gap-4 px-5 py-4 ${i < flags.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-[12.5px] font-mono font-semibold text-forest-900">{f.slug}</code>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${f.is_globally_enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.is_globally_enabled ? 'On' : 'Off'}
                  </span>
                </div>
                <div className="text-[13px] font-semibold text-gray-900 mt-1">{f.name}</div>
                {f.description && <div className="text-[12px] text-gray-500 mt-1 leading-relaxed">{f.description}</div>}
                <div className="text-[10.5px] text-gray-300 mt-1.5">Mis à jour {new Date(f.updated_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <button
                type="button"
                onClick={() => setPending({ flag: f, nextEnabled: !f.is_globally_enabled })}
                aria-label={`${f.is_globally_enabled ? 'Désactiver' : 'Activer'} ${f.slug}`}
                aria-pressed={f.is_globally_enabled}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-1 ${f.is_globally_enabled ? 'bg-forest-700' : 'bg-gray-300'} cursor-pointer`}
              >
                <span className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${f.is_globally_enabled ? 'left-[22px]' : 'left-[2px]'}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14.5px] font-bold text-gray-900">
                {pending.nextEnabled ? 'Activer' : 'Désactiver'} <code className="font-mono">{pending.flag.slug}</code> ?
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12.5px] text-gray-500 mb-3 leading-relaxed">{pending.flag.description}</p>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Pourquoi ce changement ?" className="w-full" disabled={submitting} />
              <p className="mt-2 text-[11px] text-gray-400">Le motif est tracé indéfiniment dans l&apos;audit log.</p>
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => { setPending(null); setReason('') }} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={submit} disabled={submitting || !reason.trim()} className={`px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white disabled:opacity-50 ${pending.nextEnabled ? 'bg-forest-700 hover:bg-forest-900' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {submitting ? 'En cours…' : pending.nextEnabled ? 'Activer' : 'Désactiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
