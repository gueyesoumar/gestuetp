import type { PortfolioOrg } from './useSupervisedPortfolio'
import { attentionReasons, type AttnTone } from './riskAttention'
import { IicBadge, expColor } from './riskLabels'

const TONE: Record<AttnTone, string> = {
  crit: 'bg-red-50 text-red-700',
  warn: 'bg-amber-50 text-amber-700',
  gold: 'bg-[#FBF4E2] text-[#9C7A1F]',
  neutral: 'bg-gray-100 text-gray-500',
}

interface Props {
  items: PortfolioOrg[]
  uncovered: Set<string>
  onSelect: (o: PortfolioOrg) => void
}

/** Liste « À traiter en priorité » : assujettis triés par score d'attention. */
export function AttentionList({ items, uncovered, onSelect }: Props): JSX.Element {
  if (items.length === 0) return <p className="px-4 py-6 text-center text-[13px] text-gray-400">Rien ne requiert d&apos;attention particulière.</p>
  return (
    <div className="divide-y divide-gray-100">
      {items.map((o) => {
        const reasons = attentionReasons(o, uncovered.has(o.organization_id))
        return (
          <button key={o.organization_id} onClick={() => onSelect(o)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-[13.5px] truncate">{o.org_name}</span>
                {o.is_iic && <IicBadge iic />}
              </div>
              <div className="text-[11px] text-gray-500">{o.sector ?? 'Secteur non renseigné'}</div>
              {reasons.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {reasons.map((r, i) => <span key={i} className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${TONE[r.tone]}`}>{r.label}</span>)}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono font-bold text-[17px]" style={{ color: expColor(o.max_exposure) }}>{o.max_exposure}</div>
              <div className="text-[10px] text-gray-400">expo max</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
