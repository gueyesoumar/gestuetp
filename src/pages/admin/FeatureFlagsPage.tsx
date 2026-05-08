import { useMemo, useState } from 'react'
import { Sparkles, BarChart3, Palette, ShieldCheck, MessageCircle, Layers, X } from 'lucide-react'
import { useFeatureFlags, type FeatureFlag, type FeatureCategory } from '../../features/admin/useFeatureFlags'
import { GlobalFlagCard } from '../../features/admin/featureFlags/GlobalFlagCard'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  ai: 'IA & Productivité',
  reporting: 'Reporting & Exports',
  branding: 'Marque blanche & Branding',
  security: 'Sécurité & Conformité',
  collab: 'Collaboration',
  general: 'Général',
}

const CATEGORY_ICONS: Record<FeatureCategory, JSX.Element> = {
  ai: <Sparkles size={13} />,
  reporting: <BarChart3 size={13} />,
  branding: <Palette size={13} />,
  security: <ShieldCheck size={13} />,
  collab: <MessageCircle size={13} />,
  general: <Layers size={13} />,
}

const CATEGORY_ORDER: FeatureCategory[] = ['ai', 'reporting', 'branding', 'collab', 'security', 'general']

export function FeatureFlagsPage(): JSX.Element {
  const { flags, loading, error, toggle } = useFeatureFlags()
  const [pending, setPending] = useState<{ flag: FeatureFlag; nextEnabled: boolean } | null>(null)
  const toast = useToast()

  const stats = useMemo(() => ({
    total: flags.length,
    active: flags.filter((f) => f.is_globally_enabled).length,
    off: flags.filter((f) => !f.is_globally_enabled).length,
    beta: flags.filter((f) => f.maturity === 'beta').length,
    newCount: flags.filter((f) => f.maturity === 'new').length,
  }), [flags])

  const groups = useMemo(() => CATEGORY_ORDER
    .map((cat) => ({ category: cat, items: flags.filter((f) => f.category === cat) }))
    .filter((g) => g.items.length > 0)
  , [flags])

  if (loading) return <div className="px-7 py-6"><LoadingSpinner /></div>
  if (error) return <div className="px-7 py-6"><ErrorAlert message={error} /></div>

  return (
    <div className="px-7 py-6">
      <div className="text-[11.5px] text-gray-500 mb-1">
        <b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Fonctionnalités
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Fonctionnalités</h1>
      <p className="text-[12.5px] text-gray-500 mb-5 max-w-3xl">
        Catalogue des fonctionnalités produit · activation/désactivation globale (kill switch).
        Pour la gestion plan-based par cabinet, voir l&apos;onglet « Fonctionnalités » d&apos;une organisation.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Total" value={stats.total} hint="fonctionnalités déployées" />
        <Kpi label="Actives globalement" value={stats.active} hint="kill switch ON" accent="text-emerald-700" />
        <Kpi label="Désactivées" value={stats.off} hint="kill switch OFF" accent="text-gray-700" />
        <Kpi label="En maturité" value={stats.beta + stats.newCount} hint={`${stats.beta} Beta · ${stats.newCount} Nouveau`} accent="text-gold-700" />
      </div>

      {flags.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucune fonctionnalité enregistrée.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.category}>
              <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2 inline-flex items-center gap-2">
                {CATEGORY_ICONS[group.category]}
                {CATEGORY_LABELS[group.category]}
                <span className="text-gray-400 normal-case font-mono">{group.items.length}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((f) => (
                  <GlobalFlagCard
                    key={f.id}
                    flag={f}
                    onToggle={() => setPending({ flag: f, nextEnabled: !f.is_globally_enabled })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {pending && (
        <ToggleModal
          flag={pending.flag}
          nextEnabled={pending.nextEnabled}
          onClose={() => setPending(null)}
          onConfirm={async (reason) => {
            const ok = await toggle(pending.flag.slug, pending.nextEnabled, reason)
            if (ok) {
              toast.success(pending.nextEnabled ? 'Activée globalement' : 'Désactivée globalement', { description: pending.flag.name })
              setPending(null)
            } else {
              toast.error('Mise à jour impossible')
            }
            return ok
          }}
        />
      )}
    </div>
  )
}

function Kpi({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: string }): JSX.Element {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5">
      <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`text-[22px] font-extrabold ${accent ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{hint}</p>
    </div>
  )
}

function ToggleModal({ flag, nextEnabled, onClose, onConfirm }: {
  flag: FeatureFlag; nextEnabled: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<boolean>
}): JSX.Element {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (): Promise<void> => {
    if (!reason.trim()) return
    setSubmitting(true)
    await onConfirm(reason)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[14.5px] font-bold text-gray-900">
              {nextEnabled ? 'Activer' : 'Désactiver'} cette fonctionnalité globalement ?
            </h3>
            <p className="text-[11.5px] text-gray-600 mt-1 leading-relaxed">
              {nextEnabled
                ? 'La fonctionnalité redevient disponible pour tous les cabinets dont le plan l’inclut ou qui ont un override ON.'
                : 'Kill switch global : la fonctionnalité sera coupée pour TOUS les cabinets, quel que soit leur plan ou leurs overrides.'}
            </p>
            <p className="text-[10.5px] font-mono text-gray-400 mt-1.5">{flag.slug}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 shrink-0"><X size={16} /></button>
        </div>

        <div className="px-5 py-4">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            Motif <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Pourquoi ce changement ? (tracé dans l'audit log)"
            className="w-full px-3 py-2 text-[12.5px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
            disabled={submitting}
          />
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Annuler
          </button>
          <button type="button" onClick={submit} disabled={submitting || !reason.trim()}
            className={`px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white disabled:opacity-50 ${nextEnabled ? 'bg-forest-700 hover:bg-forest-900' : 'bg-red-600 hover:bg-red-700'}`}>
            {submitting ? 'En cours…' : nextEnabled ? 'Activer' : 'Désactiver'}
          </button>
        </div>
      </div>
    </div>
  )
}
