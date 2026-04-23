import { Briefcase, GitPullRequest, XCircle, CheckCircle } from 'lucide-react'
import { DashboardKpiCard } from './DashboardKpiCard'
import { Badge } from '../../components/ui/Badge'
import type { DashboardStats, MissionSummary } from './useDashboardStats'

interface PilotageDashboardProps {
  stats: DashboardStats
  missions: MissionSummary[]
}

export function PilotageDashboard({ stats, missions }: PilotageDashboardProps): JSX.Element {
  const activeMissions = missions.filter((m) => m.status !== 'closure')
  const totalSubmitted = stats.pendingReviews
  const totalRejected = stats.clientRejections
  const totalApproved = activeMissions.reduce((s, m) => {
    const approved = m.totalControls > 0 ? m.evaluatedControls : 0
    return s + approved
  }, 0)
  const firstPassRate = (totalSubmitted + totalApproved) > 0
    ? Math.round((totalApproved / (totalSubmitted + totalApproved + totalRejected)) * 100)
    : 0

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <DashboardKpiCard icon={<Briefcase className="h-3.5 w-3.5" />} iconBg="bg-forest-100 text-forest-700" label="Mes missions" value={activeMissions.length} sub={`${missions.filter((m) => m.status === 'fieldwork').length} en terrain`} info="Missions où vous êtes auditeur principal ou membre de l'équipe" barColor="bg-forest-500" />
        <DashboardKpiCard icon={<GitPullRequest className="h-3.5 w-3.5" />} iconBg="bg-gold-200 text-gold-600" label="Revues en attente" value={totalSubmitted} sub="à valider en tant que lead" info="Évaluations soumises par les auditeurs qui attendent votre validation" barColor="bg-gold-500" valueColor="text-gold-600" />
        <DashboardKpiCard icon={<XCircle className="h-3.5 w-3.5" />} iconBg="bg-red-100 text-red-600" label="Rejets client" value={totalRejected} sub="à retravailler" info="Constats rejetés par le client nécessitant une révision" barColor="bg-red-500" valueColor="text-red-600" />
        <DashboardKpiCard icon={<CheckCircle className="h-3.5 w-3.5" />} iconBg="bg-emerald-100 text-emerald-600" label="Taux validation" value={`${firstPassRate}%`} sub="first-pass approval" info="Évaluations approuvées du premier coup" barColor="bg-emerald-500" valueColor="text-emerald-600" />
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-4">
        {/* Mission progress */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">Progression des missions</h3>
          <div className="space-y-5">
            {activeMissions.slice(0, 5).map((m) => {
              const pct = m.totalControls > 0 ? Math.round((m.evaluatedControls / m.totalControls) * 100) : 0
              const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-gold-500' : 'bg-red-400'
              const daysLeft = m.endDate ? Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
              const isUrgent = daysLeft !== null && daysLeft <= 7
              return (
                <div key={m.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[13px] font-semibold text-gray-900">{m.clientName || m.name}</span>
                    <span className="text-[12px] font-mono text-gray-400">{m.evaluatedControls}/{m.totalControls}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px] text-gray-400">
                    <span>{pct}%</span>
                    {isUrgent && daysLeft !== null ? (
                      <Badge label={`${daysLeft}j restants`} variant="red" />
                    ) : daysLeft !== null ? (
                      <span>{daysLeft}j restants</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
            {activeMissions.length === 0 && <p className="text-[13px] text-gray-400">Aucune mission active.</p>}
          </div>
        </div>

        <div className="space-y-4">
          {/* Review pipeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">Pipeline de revue</h3>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 text-center rounded-lg bg-gold-200 p-3">
                <div className="text-[20px] font-bold font-mono text-gold-600">{totalSubmitted}</div>
                <div className="text-[10px] text-yellow-800 mt-0.5">&Agrave; valider</div>
              </div>
              <div className="flex-1 text-center rounded-lg bg-forest-100 p-3">
                <div className="text-[20px] font-bold font-mono text-forest-700">{totalApproved}</div>
                <div className="text-[10px] text-forest-700 mt-0.5">Valid&eacute;es</div>
              </div>
              <div className="flex-1 text-center rounded-lg bg-red-100 p-3">
                <div className="text-[20px] font-bold font-mono text-red-600">{totalRejected}</div>
                <div className="text-[10px] text-red-700 mt-0.5">Rejet&eacute;es</div>
              </div>
            </div>
          </div>

          {/* Team load */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">Charge &eacute;quipe</h3>
            <p className="text-[12px] text-gray-400">La r&eacute;partition de charge sera calcul&eacute;e &agrave; partir des affectations de contr&ocirc;les.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

