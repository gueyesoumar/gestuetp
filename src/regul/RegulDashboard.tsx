import { Building2, ShieldAlert, ClipboardCheck, Gavel, Clock, TrendingUp } from 'lucide-react'
import { usePilotage } from './pilotage/usePilotage'
import { PilotageRiskMap } from './pilotage/PilotageRiskMap'
import { PilotagePriorityList } from './pilotage/PilotagePriorityList'
import { PilotageMeasuresBreakdown } from './pilotage/PilotageMeasuresBreakdown'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
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

/**
 * Tableau de bord Gëstu Regul = cockpit de supervision du parc (posture,
 * cartographie des risques, priorisation, mesures). C'est la page d'accueil
 * du régulateur ; il n'y a pas d'onglet Pilotage séparé.
 */
export function RegulDashboard(): JSX.Element {
  const { profile } = useAuth()
  const { loading, posture, riskItems, measuresByType, deadlines, priorities } = usePilotage()

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour{profile ? `, ${profile.first_name}` : ''}</h1>
        <p className="mt-1 text-[14px] text-gray-500">Posture agrégée du parc régulé et priorités d&apos;action.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi icon={<Building2 size={18} />} value={posture.total} label="Assujettis" />
        <Kpi icon={<ShieldAlert size={18} />} value={posture.highCrit} label="Criticité élevée" tone="text-red-600" />
        <Kpi icon={<TrendingUp size={18} />} value={posture.avgScore !== null ? `${posture.avgScore}%` : '—'} label="Conformité moy." />
        <Kpi icon={<ClipboardCheck size={18} />} value={posture.activeMissions} label="Missions actives" />
        <Kpi icon={<Gavel size={18} />} value={posture.openMeasures} label="Mesures ouvertes" />
        <Kpi icon={<Clock size={18} />} value={posture.overdue} label="Contrôles en retard" tone={posture.overdue > 0 ? 'text-red-600' : 'text-forest-700'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PilotageRiskMap items={riskItems} />
        <PilotagePriorityList items={priorities} />
      </div>

      <PilotageMeasuresBreakdown stats={measuresByType} soon={deadlines.soon} overdue={deadlines.overdue} />
    </div>
  )
}
