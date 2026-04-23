import { BarChart3, Clock, ShieldAlert } from 'lucide-react'
import { InfoPopover } from '../../components/ui/InfoPopover'
import { DashboardKpiCard } from './DashboardKpiCard'
import { Badge } from '../../components/ui/Badge'
import type { DashboardStats, MissionSummary, NearestDeadline } from './useDashboardStats'

interface ExecutiveDashboardProps {
  stats: DashboardStats
  missions: MissionSummary[]
  nearestDeadline: NearestDeadline | null
}

const STATUS_LABELS: Record<string, string> = {
  initialization: 'Cadrage',
  scoping: 'Cadrage',
  planning: 'Planification',
  fieldwork: 'Terrain',
  internal_review: 'Revue',
  client_review: 'Revue client',
  closure: 'Clôture',
}

const STATUS_VARIANTS: Record<string, 'green' | 'gold' | 'blue' | 'gray'> = {
  initialization: 'gray',
  scoping: 'gray',
  planning: 'gold',
  fieldwork: 'blue',
  internal_review: 'gold',
  client_review: 'gold',
  closure: 'green',
}

export function ExecutiveDashboard({ stats, missions, nearestDeadline }: ExecutiveDashboardProps): JSX.Element {
  const activeMissions = missions.filter((m) => m.status !== 'closure')
  const onTimeMissions = activeMissions.filter((m) => {
    if (!m.endDate) return true
    return new Date(m.endDate).getTime() > Date.now()
  })
  const onTimeRate = activeMissions.length > 0 ? Math.round((onTimeMissions.length / activeMissions.length) * 100) : 100
  const alertMissions = activeMissions.filter((m) => {
    if (m.endDate && new Date(m.endDate).getTime() < Date.now()) return true
    if (m.endDate) {
      const daysLeft = Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const progress = m.totalControls > 0 ? m.evaluatedControls / m.totalControls : 0
      if (daysLeft <= 7 && progress < 0.7) return true
    }
    return false
  })

  // Pipeline counts
  const pipeline: Record<string, number> = {}
  for (const m of activeMissions) {
    const phase = STATUS_LABELS[m.status] ?? m.status
    pipeline[phase] = (pipeline[phase] ?? 0) + 1
  }

  const pipelineOrder = ['Cadrage', 'Planification', 'Terrain', 'Revue', 'Revue client', 'Clôture']
  const pipelineColors: Record<string, string> = {
    Cadrage: 'bg-forest-100',
    Planification: 'bg-gold-200',
    Terrain: 'bg-forest-700',
    Revue: 'bg-gold-500',
    'Revue client': 'bg-gold-500',
    Clôture: 'bg-emerald-500',
  }
  const pipelineText: Record<string, string> = {
    Cadrage: 'text-forest-900',
    Planification: 'text-yellow-900',
    Terrain: 'text-white',
    Revue: 'text-forest-900',
    'Revue client': 'text-forest-900',
    Clôture: 'text-white',
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <DashboardKpiCard icon={<BarChart3 className="h-3.5 w-3.5" />} iconBg="bg-forest-100 text-forest-700" label="Missions actives" value={stats.activeMissions} sub={`${stats.missionsByStatus.fieldwork ?? 0} terrain · ${stats.missionsByStatus.internal_review ?? 0} revue`} info="Nombre total de missions non clôturées" barColor="bg-forest-500" />
        <DashboardKpiCard icon={<BarChart3 className="h-3.5 w-3.5" />} iconBg="bg-forest-100 text-forest-700" label="Conformité moy." value={`${stats.averageScore}%`} sub={stats.averageScore >= 80 ? 'Objectif atteint' : 'Objectif : 80%'} info="Score moyen pondéré de toutes les missions actives" barColor="bg-emerald-500" valueColor={stats.averageScore >= 80 ? 'text-emerald-600' : stats.averageScore >= 60 ? 'text-gold-600' : 'text-red-600'} />
        <DashboardKpiCard icon={<Clock className="h-3.5 w-3.5" />} iconBg="bg-gold-200 text-gold-600" label="Respect délais" value={`${onTimeRate}%`} sub={`${onTimeMissions.length}/${activeMissions.length} dans les temps`} info="Pourcentage de missions dont la date de fin n'est pas dépassée et dont la progression est cohérente" barColor="bg-gold-500" valueColor={onTimeRate >= 80 ? 'text-emerald-600' : 'text-gold-600'} />
        <DashboardKpiCard icon={<ShieldAlert className="h-3.5 w-3.5" />} iconBg="bg-red-100 text-red-600" label="Alertes" value={alertMissions.length} sub="missions nécessitant attention" info="Missions en retard ou avec progression insuffisante" barColor="bg-red-500" valueColor="text-red-600" />
      </div>

      {/* Pipeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-gray-900">Pipeline des missions par phase</h3>
          <InfoPopover text="Répartition des missions actives selon leur phase courante dans le workflow d'audit." />
        </div>
        <div className="flex h-9 rounded-lg overflow-hidden mb-3">
          {pipelineOrder.filter((p) => pipeline[p]).map((phase) => (
            <div key={phase} className={`flex items-center justify-center text-[12px] font-bold ${pipelineColors[phase]} ${pipelineText[phase]}`} style={{ flex: pipeline[phase] }}>
              {pipeline[phase]}
            </div>
          ))}
          {Object.keys(pipeline).length === 0 && <div className="flex-1 bg-gray-100 flex items-center justify-center text-xs text-gray-400">Aucune mission</div>}
        </div>
        <div className="flex gap-4 flex-wrap text-[11px] text-gray-500">
          {pipelineOrder.filter((p) => pipeline[p]).map((phase) => (
            <span key={phase} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${pipelineColors[phase]}`} />
              {phase} ({pipeline[phase]})
            </span>
          ))}
        </div>
      </div>

      {/* Portfolio + Alerts */}
      <div className="grid grid-cols-[3fr_2fr] gap-4">
        {/* Portfolio */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-[14px] font-bold text-gray-900 mb-3">Portefeuille clients</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase border-b border-gray-200">
                <th className="text-left py-2">Client</th>
                <th className="text-left py-2">Phase</th>
                <th className="text-left py-2">Score</th>
                <th className="text-left py-2">D&eacute;lai</th>
              </tr>
            </thead>
            <tbody>
              {missions.slice(0, 6).map((m) => {
                const isLate = m.endDate && new Date(m.endDate).getTime() < Date.now()
                const daysLeft = m.endDate ? Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0
                return (
                  <tr key={m.id} className={`border-b border-gray-50 ${isLate || isUrgent ? 'bg-red-50/50' : ''}`}>
                    <td className="py-2.5 font-semibold text-gray-900">{m.clientName || m.name}</td>
                    <td className="py-2.5"><Badge label={STATUS_LABELS[m.status] ?? m.status} variant={STATUS_VARIANTS[m.status] ?? 'gray'} /></td>
                    <td className="py-2.5">
                      {m.totalControls > 0 ? (
                        <span className={`font-mono font-bold ${m.evaluatedControls / m.totalControls >= 0.8 ? 'text-emerald-600' : m.evaluatedControls / m.totalControls >= 0.5 ? 'text-gold-600' : 'text-red-600'}`}>
                          {Math.round((m.evaluatedControls / m.totalControls) * 100)}%
                        </span>
                      ) : <span className="text-gray-300">&mdash;</span>}
                    </td>
                    <td className="py-2.5 text-[12px]">
                      {isLate ? <span className="text-red-600 font-semibold">&#9888; En retard</span>
                        : isUrgent ? <span className="text-red-600 font-semibold">&#9888; {daysLeft}j</span>
                        : daysLeft !== null ? <span className="text-emerald-600">&#10003; {daysLeft}j</span>
                        : <span className="text-gray-300">&mdash;</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          {/* Alert missions */}
          {alertMissions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 border-l-4 border-l-red-500">
              <h3 className="text-[14px] font-bold text-red-600 mb-3">&#9888; Missions en alerte</h3>
              <div className="space-y-3">
                {alertMissions.slice(0, 3).map((m) => {
                  const isLate = m.endDate && new Date(m.endDate).getTime() < Date.now()
                  const daysLeft = m.endDate ? Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                  return (
                    <div key={m.id} className="rounded-lg bg-red-50 p-3">
                      <div className="text-[13px] font-semibold text-gray-900">{m.clientName || m.name}</div>
                      <div className="text-[11px] text-red-600 font-medium mt-1">
                        {isLate ? `Date dépassée depuis ${Math.abs(daysLeft ?? 0)}j` : `Échéance dans ${daysLeft}j`}
                        {m.totalControls > 0 && ` · ${Math.round((m.evaluatedControls / m.totalControls) * 100)}% de progression`}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">Phase : {STATUS_LABELS[m.status]} - {m.evaluatedControls}/{m.totalControls} contrôles</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Nearest deadline */}
          {nearestDeadline && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-[14px] font-bold text-gray-900 mb-3">Prochaine &eacute;ch&eacute;ance</h3>
              <div className={`text-[28px] font-extrabold ${nearestDeadline.daysRemaining <= 7 ? 'text-red-600' : 'text-forest-700'}`}>
                {nearestDeadline.daysRemaining}j
              </div>
              <div className="text-[12px] text-gray-400 mt-1">{nearestDeadline.missionName}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

