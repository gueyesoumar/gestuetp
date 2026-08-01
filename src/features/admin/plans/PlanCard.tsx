import { Copy, Trash2, Star, Sparkles, Zap, Building2 } from 'lucide-react'
import type { AdminPlan, PlanTier } from './useAdminPlans'

interface PlanCardProps {
  plan: AdminPlan
  totalFeatures: number
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const TIER_ICONS: Record<PlanTier, JSX.Element> = {
  free: <Sparkles size={16} />,
  standard: <Zap size={16} />,
  enterprise: <Building2 size={16} />,
  custom: <Star size={16} />,
}

const TIER_COLORS: Record<PlanTier, { bg: string; text: string }> = {
  free: { bg: 'bg-blue-50', text: 'text-blue-600' },
  standard: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  enterprise: { bg: 'bg-purple-50', text: 'text-purple-600' },
  custom: { bg: 'bg-gold-100', text: 'text-gold-700' },
}

function formatPrice(price: number): { value: string; suffix: string } {
  if (price === 0) return { value: '0 €', suffix: '/mois' }
  return { value: `${price.toLocaleString('fr-FR')} €`, suffix: '/mois' }
}

function formatLimit(value: number | null): string {
  return value === null ? '∞' : String(value)
}

export function PlanCard({ plan, totalFeatures, onEdit, onDuplicate, onDelete }: PlanCardProps): JSX.Element {
  const tierColor = TIER_COLORS[plan.tier]
  const price = formatPrice(plan.monthly_price_eur)
  const canDelete = plan.cabinets_count === 0
  const ringClass = plan.is_default ? 'ring-2 ring-gold-300' : ''

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 relative hover:shadow-md transition-shadow ${ringClass}`}>
      {plan.is_default && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-br from-gold-100 to-gold-300 text-gold-900 inline-flex items-center gap-1">
          <Star size={10} className="fill-current" /> Défaut
        </span>
      )}

      <div className="flex items-center gap-2 mb-1">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tierColor.bg} ${tierColor.text}`}>
          {TIER_ICONS[plan.tier]}
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">{plan.name}</h3>
          <span className="text-[10.5px] font-mono text-gray-400">{plan.slug}</span>
        </div>
      </div>

      <p className="text-[11.5px] text-gray-500 mt-1.5 mb-3 leading-relaxed min-h-[34px]">
        {plan.description ?? <span className="italic text-gray-300">Aucune description</span>}
      </p>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-[24px] font-extrabold text-gray-900 font-mono">{price.value}</span>
        <span className="text-[11px] text-gray-500">{price.suffix}</span>
      </div>

      <div className="space-y-1.5 mb-3 pb-3 border-b border-gray-100">
        <Row label="Cabinets sur ce plan" value={String(plan.cabinets_count)} />
        <Row label="Fonctionnalités incluses" value={`${plan.features_count} / ${totalFeatures}`} />
        <Row label="Limites" value={`${formatLimit(plan.max_users)} users · ${formatLimit(plan.max_missions)} missions`} />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onEdit}
          className="text-[11.5px] text-forest-700 font-semibold hover:text-forest-900"
        >
          Modifier
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
            title="Dupliquer"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={canDelete ? onDelete : undefined}
            disabled={!canDelete}
            className={`p-1.5 rounded transition-colors ${canDelete ? 'text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
            title={canDelete ? 'Supprimer ce plan' : `Suppression bloquée — ${plan.cabinets_count} cabinet(s) sur ce plan`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between text-[11.5px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}
