import type { SubsidiaryDetail } from './useSubsidiaryDetail'

interface SubsidiaryKPIsProps {
  data: SubsidiaryDetail
}

function formatShortDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SubsidiaryKPIs({ data }: SubsidiaryKPIsProps): JSX.Element {
  const evaluated = `${data.totalEvaluatedControls}${data.totalControlsTarget > 0 ? `/${data.totalControlsTarget}` : ''}`
  const overdueLabel = data.overdueCars > 0 ? `${data.overdueCars} en retard` : 'aucun en retard'

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card label="Missions actives" value={`${data.totalActiveMissions}`} sub="Sur cette filiale" />
      <Card label="Contrôles évalués" value={evaluated} sub="Cumul tous référentiels" />
      <Card label="Plans d'action ouverts" value={`${data.openCars}`} sub={overdueLabel} accent={data.overdueCars > 0 ? 'red' : 'forest'} />
      <Card label="Prochaine échéance" value={formatShortDate(data.nextReviewDate)} sub="Cycle ouvert le plus proche" />
    </div>
  )
}

interface CardProps {
  label: string
  value: string
  sub: string
  accent?: 'forest' | 'red'
}

function Card({ label, value, sub, accent = 'forest' }: CardProps): JSX.Element {
  const valueColor = accent === 'red' ? 'text-red-700' : 'text-forest-700'
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
