import { MEASURE_TYPE_LABELS } from '../../lib/constants'
import type { TypeStat } from './usePilotage'

/** Répartition des mesures par niveau + échéances (M8). */
export function PilotageMeasuresBreakdown({ stats, soon, overdue }: { stats: TypeStat[]; soon: number; overdue: number }): JSX.Element {
  const max = Math.max(1, ...stats.map((s) => s.total))
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Mesures en cours</h3>
        <div className="flex gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">{soon} échéance(s) &lt; 30j</span>
          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">{overdue} en retard</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {stats.map((s) => (
          <div key={s.type} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-[12px] text-gray-600">{MEASURE_TYPE_LABELS[s.type]}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-forest-500 rounded-full" style={{ width: `${(s.total / max) * 100}%` }} />
            </div>
            <span className="w-24 shrink-0 text-[11px] text-gray-500 text-right">{s.open} ouverte(s) / {s.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
