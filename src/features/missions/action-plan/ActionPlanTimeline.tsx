import { isOverdue } from './ActionPlanKPIs'
import { getEffectiveClassification, type ActionPlanCAR } from '../../reports/generateActionPlanXLSX'

interface ActionPlanTimelineProps {
  cars: ActionPlanCAR[]
  onSelect: (car: ActionPlanCAR) => void
}

const CLASS_COLORS: Record<string, string> = {
  major_nc: 'border-red-300 bg-red-50',
  minor_nc: 'border-orange-300 bg-orange-50',
  observation: 'border-blue-300 bg-blue-50',
}

function formatMonthYear(d: string): string {
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function formatDay(d: string): string {
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function ActionPlanTimeline({ cars, onSelect }: ActionPlanTimelineProps): JSX.Element {
  // Filtrer + trier par échéance
  const withDeadline = cars
    .map((c) => ({ car: c, due: c.client_target_date ?? c.deadline }))
    .filter((x): x is { car: ActionPlanCAR; due: string } => !!x.due)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())

  if (withDeadline.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-400">Aucune action avec échéance.</p>
      </div>
    )
  }

  // Grouper par mois
  const groups = new Map<string, typeof withDeadline>()
  for (const item of withDeadline) {
    const key = formatMonthYear(item.due)
    const arr = groups.get(key) ?? []
    arr.push(item)
    groups.set(key, arr)
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([month, items]) => (
        <div key={month}>
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 sticky top-0 bg-white py-2 border-b border-gray-200">
            {month}
          </h4>
          <div className="space-y-2">
            {items.map(({ car, due }) => {
              const overdue = isOverdue(car)
              const classKey = getEffectiveClassification(car) ?? car.finding_classification
              const colorClass = CLASS_COLORS[classKey] ?? 'border-gray-200 bg-gray-50'
              return (
                <button
                  key={car.id}
                  onClick={() => onSelect(car)}
                  className={`w-full flex items-stretch border rounded-xl bg-white hover:shadow-sm transition-all text-left ${overdue ? 'ring-1 ring-red-300' : ''}`}
                >
                  <div className={`flex flex-col items-center justify-center w-20 shrink-0 border-r ${colorClass}`}>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">{formatDay(due).split(' ')[1]}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatDay(due).split(' ')[0]}</p>
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold text-forest-700">{car.code}</span>
                      {car.control_code && <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{car.control_code}</span>}
                      {overdue && <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">RETARD</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{car.control_name ?? car.description.slice(0, 80)}</p>
                    {car.domain_name && <p className="text-[11px] text-gray-500 mt-0.5">{car.domain_name}</p>}
                  </div>
                  <div className="flex items-center px-4 shrink-0">
                    <StatusBadge status={car.status} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const cfg: Record<string, { label: string; color: string }> = {
    open: { label: 'Ouvert', color: 'text-amber-700 bg-amber-50' },
    client_responded: { label: 'À vérifier', color: 'text-blue-700 bg-blue-50' },
    verified: { label: 'Vérifié', color: 'text-green-700 bg-green-50' },
    closed: { label: 'Clôturé', color: 'text-gray-500 bg-gray-100' },
  }
  const c = cfg[status] ?? cfg.open
  return <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${c.color}`}>{c.label}</span>
}
