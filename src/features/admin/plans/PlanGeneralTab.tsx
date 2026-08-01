import type { PlanTier } from './useAdminPlans'

interface PlanGeneralTabProps {
  isEdit: boolean
  slug: string
  name: string
  setName: (v: string) => void
  description: string | null
  setDescription: (v: string) => void
  tier: PlanTier
  setTier: (v: PlanTier) => void
  price: string
  setPrice: (v: string) => void
  isDefault: boolean
  setIsDefault: (v: boolean) => void
  cabinetsImpact?: number
  disabled?: boolean
}

const TIERS: Array<{ value: PlanTier; label: string }> = [
  { value: 'free', label: 'Free — gratuit, démo / découverte' },
  { value: 'standard', label: 'Standard — payant, usage régulier' },
  { value: 'enterprise', label: 'Enterprise — grands comptes' },
  { value: 'custom', label: 'Custom — sur devis / accord spécifique' },
]

export function PlanGeneralTab(props: PlanGeneralTabProps): JSX.Element {
  const { isEdit, slug, name, setName, description, setDescription, tier, setTier,
    price, setPrice, isDefault, setIsDefault, cabinetsImpact, disabled } = props

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom du plan *">
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pro" disabled={disabled}
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
          />
        </Field>
        {isEdit && (
          <Field label="Slug (immutable)">
            <input
              type="text" value={slug} disabled
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono bg-gray-50 text-gray-500"
            />
          </Field>
        )}
      </div>

      <Field label="Description">
        <textarea
          value={description ?? ''} onChange={(e) => setDescription(e.target.value)}
          rows={2} placeholder="Décrit le plan et son public cible…" disabled={disabled}
          className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
        />
      </Field>

      <Field label="Tier *">
        <select value={tier} onChange={(e) => setTier(e.target.value as PlanTier)} disabled={disabled}
          className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300">
          {TIERS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
        </select>
      </Field>

      <Field label="Prix mensuel (€) *">
        <input
          type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
        />
      </Field>

      <label className="flex items-center gap-2 text-[12.5px] text-gray-700 cursor-pointer">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} disabled={disabled}
          className="w-4 h-4 accent-forest-700" />
        <span>Plan par défaut pour les nouveaux cabinets (un seul plan peut être défaut)</span>
      </label>

      {isEdit && cabinetsImpact !== undefined && cabinetsImpact > 0 && (
        <div className="bg-gold-50 border border-gold-300 rounded-lg p-3">
          <p className="text-[11.5px] text-gold-900">
            <b>Impact :</b> {cabinetsImpact} cabinet{cabinetsImpact > 1 ? 's' : ''} sur ce plan verront les modifications immédiatement.
          </p>
        </div>
      )}
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
