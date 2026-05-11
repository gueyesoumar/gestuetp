import { useNavigate } from 'react-router-dom'
import { ClipboardList, FileEdit, CheckCircle, GitPullRequest, ArrowRight, Play, Send } from 'lucide-react'
import { DashboardKpiCard } from './DashboardKpiCard'
import type { DashboardStats, MissionSummary } from './useDashboardStats'

interface OperationnelDashboardProps {
  stats: DashboardStats
  missions: MissionSummary[]
}

export function OperationnelDashboard({ stats, missions }: OperationnelDashboardProps): JSX.Element {
  const navigate = useNavigate()
  const activeMissions = missions.filter((m) => m.status !== 'closure')
  const totalControls = activeMissions.reduce((s, m) => s + m.totalControls, 0)
  const evaluatedControls = activeMissions.reduce((s, m) => s + m.evaluatedControls, 0)
  const remaining = totalControls - evaluatedControls

  // Find the most recently updated mission with pending work (for "Resume" action)
  const resumeMission = activeMissions
    .filter((m) => m.totalControls > 0 && m.evaluatedControls < m.totalControls)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <DashboardKpiCard icon={<ClipboardList className="h-3.5 w-3.5" />} iconBg="bg-forest-100 text-forest-700" label="Mes contrôles" value={totalControls} sub={`sur ${activeMissions.length} mission${activeMissions.length !== 1 ? 's' : ''}`} info="Contrôles qui vous sont affectés sur toutes vos missions actives" barColor="bg-forest-500" />
        <DashboardKpiCard icon={<FileEdit className="h-3.5 w-3.5" />} iconBg="bg-gold-200 text-gold-600" label="À traiter" value={remaining} sub="non soumis" info="Contrôles à traiter : non commencés ou en brouillon, pas encore soumis pour revue" barColor="bg-gold-500" valueColor="text-gold-600" />
        <DashboardKpiCard icon={<CheckCircle className="h-3.5 w-3.5" />} iconBg="bg-emerald-100 text-emerald-600" label="Validés" value={stats.approvedCount} sub={`${totalControls > 0 ? Math.round((stats.approvedCount / totalControls) * 100) : 0}% de vos contrôles`} info="Contrôles dont l'évaluation a été approuvée par le lead ou l'associé" barColor="bg-emerald-500" valueColor="text-emerald-600" />
        <DashboardKpiCard icon={<GitPullRequest className="h-3.5 w-3.5" />} iconBg="bg-gold-200 text-gold-600" label="En revue" value={stats.pendingReviews + stats.clientRejections} sub={`${stats.pendingReviews} soumis · ${stats.clientRejections} rejeté${stats.clientRejections !== 1 ? 's' : ''}`} info="Soumis en attente de validation + rejetés" barColor="bg-gold-500" valueColor="text-gold-600" />
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-4">
        {/* My controls */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-[14px] font-bold text-gray-900 mb-3">Ma progression</h3>
          {activeMissions.length === 0 ? (
            <p className="text-[13px] text-gray-400">Aucune mission active.</p>
          ) : (
            <div className="space-y-5">
              {activeMissions.slice(0, 4).map((m) => {
                const pct = m.totalControls > 0 ? Math.round((m.evaluatedControls / m.totalControls) * 100) : 0
                const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-gold-500' : pct > 0 ? 'bg-red-400' : 'bg-gray-200'
                const rem = m.totalControls - m.evaluatedControls
                return (
                  <div key={m.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[13px] font-semibold text-gray-900">{m.clientName || m.name}</span>
                      <span className="text-[12px] font-mono text-gray-400">{m.evaluatedControls}/{m.totalControls}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1.5 text-[11px] text-gray-400">
                      {pct}% {rem > 0 ? `- ${rem} restant${rem > 1 ? 's' : ''}` : '- Terminé'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Resume action */}
          {resumeMission ? (
            <button
              onClick={() => navigate(`/missions/${resumeMission.id}`)}
              className="w-full rounded-xl border-2 border-forest-700 bg-forest-50 p-5 text-left hover:bg-forest-100 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-forest-700 text-white">
                  <Play size={14} />
                </div>
                <span className="text-[13px] font-semibold text-forest-700">Reprendre</span>
              </div>
              <div className="text-[14px] font-bold text-gray-900">{resumeMission.clientName || resumeMission.name}</div>
              <div className="text-[12px] text-gray-500 mt-1">
                {resumeMission.evaluatedControls}/{resumeMission.totalControls} contr&ocirc;les &eacute;valu&eacute;s
                {' '}&mdash;{' '}
                {Math.round((resumeMission.evaluatedControls / resumeMission.totalControls) * 100)}%
              </div>
              <div className="flex items-center gap-1 text-[11px] text-forest-600 font-medium mt-2 group-hover:gap-2 transition-all">
                Ouvrir la mission <ArrowRight size={12} />
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600">
                  <Send size={14} />
                </div>
                <span className="text-[13px] font-semibold text-emerald-600">Tout est &agrave; jour</span>
              </div>
              <p className="text-[13px] text-gray-400">Aucun contr&ocirc;le en attente de documentation.</p>
            </div>
          )}

          {/* Link to missions */}
          {remaining > 0 && (
            <button
              onClick={() => navigate('/missions')}
              className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-left hover:bg-forest-50 transition-colors flex items-center justify-between"
            >
              <span className="text-[13px] font-medium text-gray-700">
                Voir mes {remaining} contr&ocirc;le{remaining > 1 ? 's' : ''} &agrave; traiter
              </span>
              <ArrowRight size={14} className="text-gray-300" />
            </button>
          )}

          {/* Upcoming interviews */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">Prochains entretiens</h3>
            {activeMissions.length === 0 ? (
              <p className="text-[13px] text-gray-400">Aucun entretien planifi&eacute;.</p>
            ) : (
              <p className="text-[13px] text-gray-400">Les entretiens planifi&eacute;s dans vos missions apparaîtront ici.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

