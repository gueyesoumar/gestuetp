import type { SubscriptionAction } from './useOrgSubscription'

interface Props {
  mrr: number
  discountPct: number
  platformMrr: number | null
  busy: boolean
  onAct: (a: SubscriptionAction) => void
}

const CHIPS = [0, 10, 20, 30]
const euro = (n: number) => n.toLocaleString('fr-FR')

export function SubscriptionMrrPanel({ mrr, discountPct, platformMrr, busy, onAct }: Props): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">MRR net</div>
      <div className="text-[32px] font-extrabold text-forest-900 leading-none mt-1">
        {euro(mrr)} <span className="text-[14px] font-medium text-gray-500">&euro; / mois</span>
      </div>

      <div className="mt-4 border-t border-gray-200 pt-3">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-2">Remise globale</div>
        <div className="flex gap-1.5 flex-wrap">
          {CHIPS.map((d) => (
            <button key={d} type="button" disabled={busy || d === discountPct}
              onClick={() => onAct({ action: 'set_discount', discount_pct: d })}
              className={`text-[11.5px] font-mono font-semibold rounded-full px-3 py-1 border ${d === discountPct ? 'bg-forest-700 text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-forest-500'} disabled:cursor-default`}>
              {d} %
            </button>
          ))}
        </div>
      </div>

      {platformMrr !== null && (
        <div className="mt-4 border-t border-gray-200 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Portefeuille (toutes orgs)</span>
          <span className="text-[13px] font-mono font-bold text-forest-700">{euro(platformMrr)} &euro;</span>
        </div>
      )}
    </div>
  )
}
