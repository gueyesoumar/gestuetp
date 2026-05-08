import { useState } from 'react'
import { X } from 'lucide-react'
import type { AdminPlan, PlanInput, PlanTier } from './useAdminPlans'

interface PlanFormModalProps {
  plan: AdminPlan | null
  onClose: () => void
  onSubmit: (input: PlanInput, reason: string) => Promise<{ ok: boolean; error?: string }>
  cabinetsImpact?: number
}

const TIERS: Array<{ value: PlanTier; label: string }> = [
  { value: 'free', label: 'Free — gratuit, démo / découverte' },
  { value: 'standard', label: 'Standard — payant, usage régulier' },
  { value: 'enterprise', label: 'Enterprise — grands comptes' },
  { value: 'custom', label: 'Custom — sur devis / accord spécifique' },
]

export function PlanFormModal({ plan, onClose, onSubmit, cabinetsImpact }: PlanFormModalProps): JSX.Element {
  const isEdit = plan !== null
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [price, setPrice] = useState(String(plan?.monthly_price_eur ?? 0))
  const [tier, setTier] = useState<PlanTier>(plan?.tier ?? 'standard')
  const [maxUsers, setMaxUsers] = useState(plan?.max_users != null ? String(plan.max_users) : '')
  const [maxMissions, setMaxMissions] = useState(plan?.max_missions != null ? String(plan.max_missions) : '')
  const [isDefault, setIsDefault] = useState(plan?.is_default ?? false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim() || !reason.trim()) return
    const numPrice = Number(price)
    if (Number.isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('Prix invalide')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)
    const input: PlanInput = {
      name: name.trim(),
      description: description.trim() || null,
      monthly_price_eur: numPrice,
      tier,
      max_users: maxUsers === '' ? null : Number(maxUsers),
      max_missions: maxMissions === '' ? null : Number(maxMissions),
      is_default: isDefault,
    }
    const res = await onSubmit(input, reason)
    setSubmitting(false)
    if (res.ok) onClose()
    else setErrorMsg(res.error ?? 'Action impossible')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">
              {isEdit ? 'Modifier le plan' : 'Créer un plan'}
            </h3>
            <p className="text-[11.5px] text-gray-500 mt-0.5">
              {isEdit
                ? 'Les modifications s’appliquent immédiatement à tous les cabinets sur ce plan.'
                : 'Le slug technique est auto-généré à partir du nom et non modifiable après création.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom du plan *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pro"
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
                disabled={submitting}
              />
            </Field>

            {isEdit && (
              <Field label="Slug (immutable)">
                <input
                  type="text"
                  value={plan.slug}
                  disabled
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono bg-gray-50 text-gray-500"
                />
              </Field>
            )}
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Décrit le plan et son public cible…"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
              disabled={submitting}
            />
          </Field>

          <Field label="Tier *">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as PlanTier)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
              disabled={submitting}
            >
              {TIERS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Prix mensuel (€) *">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
                disabled={submitting}
              />
            </Field>
            <Field label="Max utilisateurs (vide = ∞)">
              <input
                type="number"
                min="1"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                placeholder="∞"
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
                disabled={submitting}
              />
            </Field>
            <Field label="Max missions (vide = ∞)">
              <input
                type="number"
                min="1"
                value={maxMissions}
                onChange={(e) => setMaxMissions(e.target.value)}
                placeholder="∞"
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
                disabled={submitting}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 accent-forest-700"
              disabled={submitting}
            />
            <span>Plan par défaut pour les nouveaux cabinets (un seul plan peut être défaut)</span>
          </label>

          {isEdit && cabinetsImpact !== undefined && cabinetsImpact > 0 && (
            <div className="bg-gold-50 border border-gold-300 rounded-lg p-3">
              <p className="text-[11.5px] text-gold-900">
                <b>Impact :</b> {cabinetsImpact} cabinet{cabinetsImpact > 1 ? 's' : ''} sur ce plan verront les modifications immédiatement.
              </p>
            </div>
          )}

          <Field label="Motif (obligatoire) *">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Pourquoi cette modification ? (tracé dans l'audit log)"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
              disabled={submitting}
            />
          </Field>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-[12px] text-red-700">{errorMsg}</div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !reason.trim()}
            className="px-3.5 py-2 text-[12.5px] font-semibold bg-forest-700 hover:bg-forest-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'En cours…' : isEdit ? 'Enregistrer' : 'Créer le plan'}
          </button>
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
