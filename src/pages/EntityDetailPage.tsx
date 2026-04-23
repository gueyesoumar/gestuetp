import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Briefcase, ShieldCheck, Calendar, AlertTriangle, ExternalLink } from 'lucide-react'
import { useEntityDetail } from '../features/supervision/useEntityDetail'
import { PHASE_LABELS } from '../features/missions/mission-constants'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

export function EntityDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const data = useEntityDetail(id)

  if (data.loading) return <LoadingSpinner />
  if (data.error) return <ErrorAlert message={data.error} />
  if (!data.entityName) return <ErrorAlert message={`Entit\u00e9 introuvable.`} />

  const scoreColor = data.globalScore >= 80 ? 'text-green-600' : data.globalScore >= 60 ? 'text-forest-700' : data.globalScore >= 40 ? 'text-gold-600' : 'text-red-500'

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/supervision')}
        className="flex items-center gap-1.5 text-xs text-forest-700 hover:text-forest-900 mb-4"
      >
        <ArrowLeft size={14} />
        Retour {'\u00e0'} la supervision
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-forest-50 flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-forest-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">{data.entityName}</h1>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
              {data.sector && (
                <span className="flex items-center gap-1"><Briefcase size={12} />{data.sector}</span>
              )}
              {data.city && (
                <span className="flex items-center gap-1"><MapPin size={12} />{data.city}</span>
              )}
              <span className="flex items-center gap-1"><Calendar size={12} />{data.totalMissions} mission{data.totalMissions > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Score global"
          value={`${data.globalScore}%`}
          valueClass={scoreColor}
          sub={data.lastAuditDate ? `Dernier audit : ${formatDate(data.lastAuditDate)}` : undefined}
          bar={data.globalScore}
          barColor={data.globalScore >= 80 ? '#27AE60' : data.globalScore >= 60 ? '#40916C' : data.globalScore >= 40 ? '#D4A843' : '#C0392B'}
        />
        <KpiCard
          label="Missions r&eacute;alis&eacute;es"
          value={`${data.totalMissions}`}
          valueClass="text-forest-700"
        />
        <KpiCard
          label="Derni&egrave;re mission"
          value={data.lastAuditDate ? formatDate(data.lastAuditDate) : '\u2014'}
          valueClass="text-forest-700"
          smallValue
          sub={data.missions[0]?.frameworkName}
        />
        <KpiCard
          label="NC majeures ouvertes"
          value={`${data.openMajorNcs}`}
          valueClass={data.openMajorNcs > 0 ? 'text-red-500' : 'text-green-600'}
          sub={data.openMajorNcs === 0 ? 'Aucune NC majeure en cours' : undefined}
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        {/* Left: Missions table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
            <ShieldCheck size={15} className="text-forest-700" />
            <span className="text-[13px] font-semibold text-gray-900">Missions d{'\u2019'}audit</span>
            <span className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full ml-auto">
              {data.missions.length}
            </span>
          </div>

          {data.missions.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-gray-300">
              Aucune mission d{'\u2019'}audit pour cette entit{'\u00e9'}.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left px-5 py-2.5 font-semibold">Mission</th>
                  <th className="text-left px-3 py-2.5 font-semibold">R{'\u00e9'}f{'\u00e9'}rentiel</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Cabinet</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Score</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Statut</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {data.missions.map((m) => {
                  const sc = m.score >= 80 ? 'text-green-600' : m.score >= 60 ? 'text-forest-700' : m.score >= 40 ? 'text-gold-600' : 'text-red-500'
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-forest-50/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {m.canNavigate ? (
                          <Link to={`/missions/${m.id}`} className="text-forest-700 hover:underline">{m.name}</Link>
                        ) : (
                          m.name
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-500">{m.frameworkName}</td>
                      <td className="px-3 py-3 text-gray-500">{m.cabinetName}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${sc}`}>{m.totalControls > 0 ? `${m.score}%` : '\u2014'}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-400">{m.endDate ? formatDate(m.endDate) : m.startDate ? formatDate(m.startDate) : '\u2014'}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-3 py-3">
                        {m.canNavigate ? (
                          <Link to={`/missions/${m.id}`} className="text-forest-700 hover:text-forest-900">
                            <ExternalLink size={13} />
                          </Link>
                        ) : (
                          <span className="text-gray-200 cursor-default" title={`Audit r\u00e9alis\u00e9 par un cabinet externe`}>
                            <ExternalLink size={13} />
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Domain scores */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={15} className="text-gray-400" />
            <span className="text-[13px] font-semibold text-gray-700">Conformit{'\u00e9'} par domaine</span>
          </div>
          {data.domainScores.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-6">Aucune donn{'\u00e9'}e disponible.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {data.domainScores.map((d) => {
                const barColor = d.score >= 80 ? '#27AE60' : d.score >= 60 ? '#40916C' : d.score >= 40 ? '#D4A843' : '#C0392B'
                return (
                  <div key={d.code}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-700 truncate flex-1">{d.code} {d.name}</span>
                      <span className="font-semibold ml-2" style={{ color: barColor }}>{d.score}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, background: barColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* NC alert */}
          {data.openMajorNcs > 0 && (
            <div className="mt-5 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-red-700">{data.openMajorNcs} NC majeure{data.openMajorNcs > 1 ? 's' : ''} ouverte{data.openMajorNcs > 1 ? 's' : ''}</p>
                <p className="text-[10px] text-red-500 mt-0.5">Actions correctives en attente</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, valueClass, sub, bar, barColor, smallValue }: {
  label: string; value: string; valueClass: string; sub?: string
  bar?: number; barColor?: string; smallValue?: boolean
}): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <p className={`font-bold leading-none ${valueClass} ${smallValue ? 'text-[14px] mt-1' : 'text-[22px]'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {bar !== undefined && (
        <div className="h-1 bg-gray-100 rounded-full mt-2.5">
          <div className="h-1 rounded-full transition-all" style={{ width: `${bar}%`, background: barColor }} />
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const label = PHASE_LABELS[status] ?? status
  const style = status === 'closure' ? 'bg-green-50 text-green-600'
    : status === 'client_review' || status === 'internal_review' ? 'bg-gold-50 text-gold-600'
    : status === 'fieldwork' ? 'bg-forest-50 text-forest-700'
    : 'bg-gray-100 text-gray-500'

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style}`}>{label}</span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
