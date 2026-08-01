import { useState } from 'react'
import { X } from 'lucide-react'
import type { FeatureCatalogItem, FeatureCategory, FeatureMaturity } from '../plans/useFeatureCatalog'
import type { FeatureCreateInput, FeatureUpdateInput } from './featureCrud'

interface FeatureFormModalProps {
  feature: FeatureCatalogItem | null
  onClose: () => void
  onSubmit: (input: FeatureCreateInput | FeatureUpdateInput, reason: string) => Promise<{ ok: boolean; error?: string }>
  onRequestDelete?: () => void
}

const CATEGORIES: Array<{ value: FeatureCategory; label: string }> = [
  { value: 'ai', label: 'IA & Productivité' },
  { value: 'reporting', label: 'Reporting & Exports' },
  { value: 'branding', label: 'Marque blanche & Branding' },
  { value: 'security', label: 'Sécurité & Conformité' },
  { value: 'collab', label: 'Collaboration' },
  { value: 'general', label: 'Général' },
]

const MATURITIES: Array<{ value: FeatureMaturity; label: string }> = [
  { value: 'stable', label: 'Stable — production' },
  { value: 'beta', label: 'Beta — utilisable mais en évolution' },
  { value: 'new', label: 'Nouveau — récemment lancé' },
]

export function FeatureFormModal({ feature, onClose, onSubmit, onRequestDelete }: FeatureFormModalProps): JSX.Element {
  const isEdit = feature !== null
  const [name, setName] = useState(feature?.name ?? '')
  const [description, setDescription] = useState(feature?.description ?? '')
  const [category, setCategory] = useState<FeatureCategory>(feature?.category ?? 'general')
  const [maturity, setMaturity] = useState<FeatureMaturity>(feature?.maturity ?? 'new')
  const [iconName, setIconName] = useState(feature?.icon_name ?? '')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim() || !reason.trim()) return
    setSubmitting(true)
    setErrorMsg(null)
    const input: FeatureCreateInput = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      maturity,
      icon_name: iconName.trim() || null,
    }
    const res = await onSubmit(input, reason)
    setSubmitting(false)
    if (res.ok) onClose()
    else setErrorMsg(res.error ?? 'Action impossible')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-xl w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">
              {isEdit ? 'Modifier la fonctionnalité' : 'Créer une fonctionnalité'}
            </h3>
            <p className="text-[11.5px] text-gray-500 mt-0.5">
              {isEdit
                ? 'Le slug est immuable. Pour changer le slug, supprimez et recréez.'
                : 'Le slug technique sera auto-généré depuis le nom et ne pourra plus être modifié.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom *">
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Plan d'action généré par IA" disabled={submitting}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
              />
            </Field>
            {isEdit && (
              <Field label="Slug (immuable)">
                <input
                  type="text" value={feature.slug} disabled
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono bg-gray-50 text-gray-500"
                />
              </Field>
            )}
          </div>

          <Field label="Description">
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={2} placeholder="À quoi sert cette fonctionnalité ? Phrase courte." disabled={submitting}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Catégorie *">
              <select value={category} onChange={(e) => setCategory(e.target.value as FeatureCategory)} disabled={submitting}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Maturité *">
              <select value={maturity} onChange={(e) => setMaturity(e.target.value as FeatureMaturity)} disabled={submitting}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300">
                {MATURITIES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Icône (slug lucide-react · optionnel)">
            <input
              type="text" value={iconName} onChange={(e) => setIconName(e.target.value)}
              placeholder="Ex: sparkles, file-text, shield-check" disabled={submitting}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
            />
          </Field>

          <Field label="Motif (obligatoire) *">
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              rows={2} placeholder="Pourquoi cette modification ? (tracé dans l'audit log)" disabled={submitting}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
            />
          </Field>

          {errorMsg && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-[12px] text-red-700">{errorMsg}</div>}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          {isEdit && onRequestDelete ? (
            <button type="button" onClick={onRequestDelete} disabled={submitting}
              className="text-[11.5px] text-red-600 hover:text-red-700 font-semibold disabled:opacity-40">
              Supprimer cette fonctionnalité
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting || !name.trim() || !reason.trim()}
              className="px-3.5 py-2 text-[12.5px] font-semibold bg-forest-700 hover:bg-forest-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'En cours…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  )
}
