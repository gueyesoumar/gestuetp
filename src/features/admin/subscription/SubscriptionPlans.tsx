import type { Product } from '../../../types/database.types'
import type { SubscriptionPlan, SubscriptionAction } from './useOrgSubscription'

interface Props {
  plans: SubscriptionPlan[]
  products: Product[]
  currentPlan: string | null
  busy: boolean
  onAct: (a: SubscriptionAction) => void
}

export function SubscriptionPlans({ plans, products, currentPlan, busy, onAct }: Props): JSX.Element | null {
  if (plans.length === 0) return null
  const colorOf = (key: string) => products.find((p) => p.key === key)?.accent_color ?? '#6B7280'
  const nameOf = (key: string) => products.find((p) => p.key === key)?.name ?? key

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
      {plans.map((plan) => {
        const active = plan.slug === currentPlan
        return (
          <div key={plan.slug} className={`rounded-xl border bg-white p-4 flex flex-col gap-2 ${active ? 'border-forest-500 shadow-[0_0_0_1px_var(--color-forest-500)]' : 'border-gray-200'}`}>
            <div className="text-[13.5px] font-bold text-gray-900">{plan.name}</div>
            <div className="text-[11.5px] text-gray-500 min-h-[30px]">{plan.description}</div>
            <div className="flex flex-wrap gap-1">
              {plan.products.map((k) => (
                <span key={k} className="text-[10px] rounded-md px-1.5 py-0.5 border"
                  style={{ color: colorOf(k), borderColor: `${colorOf(k)}66` }}>{nameOf(k)}</span>
              ))}
            </div>
            <button type="button" disabled={busy} onClick={() => onAct({ action: 'apply_plan', plan_slug: plan.slug })}
              className={`text-[13px] font-semibold rounded-lg px-3 py-2 ${active ? 'border border-forest-300 text-forest-700' : 'bg-forest-700 text-white hover:bg-forest-900'} disabled:opacity-50`}>
              {active ? '✓ Appliqué' : 'Appliquer'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
