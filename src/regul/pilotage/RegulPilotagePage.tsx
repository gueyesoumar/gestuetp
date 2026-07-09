import { Building2, ShieldAlert, ClipboardCheck, Gavel, Clock, TrendingUp } from 'lucide-react'
import { usePilotage, type TypeStat } from './usePilotage'
import { PilotageRiskMap } from './PilotageRiskMap'
import { PilotagePriorityList } from './PilotagePriorityList'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { MEASURE_TYPE_LABELS } from '../../lib/constants'
import type { ReactNode } from 'react'

function Kpi({ icon, value, label, tone }: { icon: ReactNode; value: string | number; label: string; tone?: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <span className={tone ?? 'text-forest-700'}>{icon}</span>
      <p className="mt-2.5 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}

function MeasuresBreakdown({ stats, soon, overdue }: { stats: TypeStat[]; soon: number; overdue: number }): JSX.Element {
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

/** M8 — Pilotage & posture : cockpit de supervision du parc régulé (lecture seule). */
export function RegulPilotagePage(): JSX.Element {
  const { loading, posture, riskItems, measuresByType, deadlines, priorities } = usePilotage()
  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pilotage &amp; posture</h1>
        <p className="mt-1 text-[13px] text-gray-500">Posture agrégée du parc régulé et priorités d&apos;action.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi icon={<Building2 size={18} />} value={posture.total} label="Assujettis" />
        <Kpi icon={<ShieldAlert size={18} />} value={posture.oiv} label="dont OIV" tone="text-red-600" />
        <Kpi icon={<TrendingUp size={18} />} value={posture.avgScore !== null ? `${posture.avgScore}%` : '—'} label="Conformité moy." />
        <Kpi icon={<ClipboardCheck size={18} />} value={posture.activeMissions} label="Missions actives" />
        <Kpi icon={<Gavel size={18} />} value={posture.openMeasures} label="Mesures ouvertes" />
        <Kpi icon={<Clock size={18} />} value={posture.overdue} label="Contrôles en retard" tone={posture.overdue > 0 ? 'text-red-600' : 'text-forest-700'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PilotageRiskMap items={riskItems} />
        <PilotagePriorityList items={priorities} />
      </div>

      <MeasuresBreakdown stats={measuresByType} soon={deadlines.soon} overdue={deadlines.overdue} />
    </div>
  )
}
