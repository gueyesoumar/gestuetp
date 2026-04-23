import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Target, Calendar, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react'
import { useCampaignDetail } from '../features/supervision/useCampaignDetail'
import { PHASE_LABELS } from '../features/missions/mission-constants'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

const STATUS_STYLES: Record<string, { label: string; style: string }> = {
  draft: { label: 'Brouillon', style: 'bg-gray-100 text-gray-500' },
  active: { label: 'Active', style: 'bg-forest-50 text-forest-700' },
  completed: { label: 'Termin\u00e9e', style: 'bg-green-50 text-green-600' },
}

export function CampaignDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const data = useCampaignDetail(id)

  if (data.loading) return <LoadingSpinner />
  if (data.error) return <ErrorAlert message={data.error} />
  if (!data.campaign) return <ErrorAlert message="Campagne introuvable." />

  const camp = data.campaign
  const statusInfo = STATUS_STYLES[camp.status] ?? STATUS_STYLES.draft
  const pct = data.totalEntities > 0 ? Math.round((data.completedEntities / data.totalEntities) * 100) : 0
  const scoreColor = data.avgScore >= 80 ? 'text-green-600' : data.avgScore >= 60 ? 'text-forest-700' : data.avgScore >= 40 ? 'text-gold-600' : 'text-red-500'

  return (
    <div>
      {/* Back */}
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
            <Target size={20} className="text-forest-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">{camp.name}</h1>
              <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${statusInfo.style}`}>{statusInfo.label}</span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1"><ShieldCheck size={12} />{data.frameworkName}</span>
              <span className="flex items-center gap-1"><Calendar size={12} />{camp.period_label}</span>
              <span>{formatDate(camp.period_start)} {'\u2192'} {formatDate(camp.period_end)}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-forest-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[12px] font-bold text-forest-700">{data.completedEntities}/{data.totalEntities}</span>
          <span className="text-[11px] text-gray-400">entit{'\u00e9'}s audit{'\u00e9'}es</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Entit&eacute;s audit&eacute;es" value={`${data.completedEntities}/${data.totalEntities}`} valueClass="text-forest-700" bar={pct} barColor="#40916C" />
        <KpiCard label="Score moyen" value={data.avgScore > 0 ? `${data.avgScore}%` : '\u2014'} valueClass={scoreColor} />
        <KpiCard label="Progression" value={`${pct}%`} valueClass="text-forest-700" />
        <KpiCard label="NC majeures ouvertes" value={`${data.totalMajorNcs}`} valueClass={data.totalMajorNcs > 0 ? 'text-red-500' : 'text-green-600'} />
      </div>

      {/* Entity table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <ShieldCheck size={15} className="text-forest-700" />
          <span className="text-[13px] font-semibold text-gray-900">Entit{'\u00e9'}s de la campagne</span>
        </div>

        {data.entities.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-gray-300">Aucune entit{'\u00e9'} dans cette campagne.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-5 py-2.5 font-semibold">#</th>
                <th className="text-left px-3 py-2.5 font-semibold">Entit{'\u00e9'}</th>
                <th className="text-left px-3 py-2.5 font-semibold">Secteur</th>
                <th className="text-center px-3 py-2.5 font-semibold">Score</th>
                <th className="text-center px-3 py-2.5 font-semibold w-[160px]">Conformit{'\u00e9'}</th>
                <th className="text-center px-3 py-2.5 font-semibold">NC maj.</th>
                <th className="text-left px-3 py-2.5 font-semibold">Phase</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {data.entities.map((e, i) => {
                const sc = e.score >= 80 ? 'text-green-600' : e.score >= 60 ? 'text-forest-700' : e.score >= 40 ? 'text-gold-600' : 'text-red-500'
                const barBg = e.score >= 80 ? 'bg-green-500' : e.score >= 60 ? 'bg-forest-500' : e.score >= 40 ? 'bg-gold-500' : 'bg-red-400'
                return (
                  <tr key={e.entityId} className="border-b border-gray-50 hover:bg-forest-50/30 transition-colors">
                    <td className="px-5 py-3 text-gray-400 font-mono text-[11px]">{i + 1}</td>
                    <td className="px-3 py-3 font-medium">
                      <Link to={`/supervision/entites/${e.entityId}`} className="text-forest-700 hover:underline">
                        {e.entityName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{e.sector ?? '\u2014'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold ${sc}`}>{e.totalControls > 0 ? `${e.score}%` : '\u2014'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className={`h-full rounded-full ${barBg} transition-all`} style={{ width: `${e.score}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {e.majorNcCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} />{e.majorNcCount}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">0</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        e.missionStatus === 'closure' ? 'bg-green-50 text-green-600'
                        : e.missionStatus === 'fieldwork' ? 'bg-forest-50 text-forest-700'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                        {PHASE_LABELS[e.missionStatus] ?? e.missionStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/missions/${e.missionId}`} className="text-forest-700 hover:text-forest-900">
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, valueClass, bar, barColor }: {
  label: string; value: string; valueClass: string; bar?: number; barColor?: string
}): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <p className={`text-[22px] font-bold leading-none ${valueClass}`}>{value}</p>
      {bar !== undefined && (
        <div className="h-1 bg-gray-100 rounded-full mt-2.5">
          <div className="h-1 rounded-full transition-all" style={{ width: `${bar}%`, background: barColor }} />
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
