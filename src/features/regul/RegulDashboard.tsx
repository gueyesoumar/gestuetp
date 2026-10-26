import { Link } from 'react-router-dom'
import { Building2, ShieldAlert, ClipboardCheck, Gavel, Clock, TrendingUp } from 'lucide-react'
import { usePilotage } from './pilotage/usePilotage'
import { PilotageRiskMap } from './pilotage/PilotageRiskMap'
import { PilotagePriorityList } from './pilotage/PilotagePriorityList'
import { PilotageMeasuresBreakdown } from './pilotage/PilotageMeasuresBreakdown'
import { ReviewsDuePanel } from './pilotage/ReviewsDuePanel'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { InfoPopover } from '../../components/ui/InfoPopover'
import type { ReactNode } from 'react'

function Kpi({ icon, value, label, tone, to, info }: { icon: ReactNode; value: string | number; label: string; tone?: string; to?: string; info?: string }): JSX.Element {
  const inner = (
    <>
      <span className={tone ?? 'text-forest-700'}>{icon}</span>
      <p className="mt-2.5 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </>
  )
  const card = to ? (
    <Link to={to} className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-forest-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-200">
      {inner}
    </Link>
  ) : (
    <div className="rounded-xl border border-gray-200 bg-white p-4">{inner}</div>
  )
  if (!info) return card
  // Bouton info en coin, en dehors du lien (évite tout conflit de navigation).
  return (
    <div className="relative">
      {card}
      <div className="absolute top-2 right-2 z-10">
        <InfoPopover text={info} />
      </div>
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
  const { loading, posture, riskItems, measuresByType, deadlines, priorities, reviewsDue } = usePilotage()

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour{profile ? `, ${profile.first_name}` : ''}</h1>
        <p className="mt-1 text-[14px] text-gray-500">Posture agrégée du parc régulé et priorités d&apos;action.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi icon={<Building2 size={18} />} value={posture.total} label="Assujettis" to="/assujettis"
          info="Nombre d'organisations supervisées actives rattachées à l'autorité." />
        <Kpi icon={<ShieldAlert size={18} />} value={posture.highCrit} label="IIC" tone="text-red-600" to="/assujettis?crit=eleve"
          info="Assujettis à criticité élevée, c'est-à-dire les Infrastructures d'Importance Vitale (profil réglementaire dont la criticité est « élevée »)." />
        <Kpi icon={<TrendingUp size={18} />} value={posture.avgScore !== null ? `${posture.avgScore}%` : '-'} label="Conformité moy."
          info={'Moyenne des scores de conformité des assujettis ayant au moins une mission clôturée. Par assujetti : moyenne pondérée de ses contrôles cotés sur les missions clôturées (conforme 100, largement conforme 75, partiellement conforme 50, non conforme 0 ; « sans objet » et non coté sont exclus). Le tableau de bord fait ensuite la moyenne simple de ces scores, chaque assujetti comptant pour un.'} />
        <Kpi icon={<ClipboardCheck size={18} />} value={posture.activeMissions} label="Missions actives" to="/controles?statut=actives"
          info="Missions de contrôle en cours (tous statuts sauf « clôturée »), tous assujettis confondus." />
        <Kpi icon={<Gavel size={18} />} value={posture.openMeasures} label="Mesures ouvertes" to="/constats?vue=parc"
          info="Actes gradués (mesures) émis par l'autorité dont le traitement n'est pas encore clos." />
        <Kpi icon={<Clock size={18} />} value={posture.overdue} label="Plans d'action en retard" tone={posture.overdue > 0 ? 'text-red-600' : 'text-forest-700'} to="/assujettis?retard=1"
          info="Éléments du plan d'action (demandes d'action correctives) dont l'échéance (date cible de l'assujetti, sinon échéance fixée) est dépassée, tous assujettis confondus." />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PilotageRiskMap items={riskItems} />
        <PilotagePriorityList items={priorities} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PilotageMeasuresBreakdown stats={measuresByType} soon={deadlines.soon} overdue={deadlines.overdue} />
        <ReviewsDuePanel items={reviewsDue} />
      </div>
    </div>
  )
}
