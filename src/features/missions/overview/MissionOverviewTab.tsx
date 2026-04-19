import { DomainProgressList } from './DomainProgressList'
import { TeamActivityPanel } from './TeamActivityPanel'
import type { MissionDetail, MissionMemberRow } from '../useMissionDetail'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionProgress } from '../useMissionProgress'

interface MissionOverviewTabProps {
  mission: MissionDetail
  members: MissionMemberRow[]
  assessments: AssessmentWithControl[]
  domains: DomainWithControls[]
  progress: MissionProgress
  onRefetch: () => void
}

export function MissionOverviewTab({ mission, members, assessments, domains, progress, onRefetch }: MissionOverviewTabProps){
  return (
    <div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Progression globale" value={`${progress.overallPercent}%`} color="var(--color-forest-700)" bar={progress.overallPercent} barColor="#40916C" />
        <KpiCard label="Contr&ocirc;les &eacute;valu&eacute;s" value={`${progress.assessedControls}/${progress.totalControls}`} color="var(--color-gold-500)" sub={`${progress.submittedControls} soumis \u00b7 ${progress.approvedControls} approuv\u00e9s`} />
        <KpiCard label="Score provisoire" value={`${progress.provisionalScore}%`} color="var(--color-success)" sub={`Bas\u00e9 sur ${progress.assessedControls} contr\u00f4les`} />
        <KpiCard label="Jours restants" value={progress.daysRemaining !== null ? `${progress.daysRemaining}` : '\u2014'} color="var(--color-forest-700)" />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        <DomainProgressList domains={domains} assessments={assessments} />
        <TeamActivityPanel missionId={mission.id} members={members} onRefetch={onRefetch} />
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, sub, bar, barColor }: {
  label: string; value: string; color: string; sub?: string; bar?: number; barColor?: string
}){
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <p className="text-[28px] font-bold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-300 mt-1">{sub}</p>}
      {bar !== undefined && (
        <div className="h-1 bg-gray-200 rounded-full mt-2.5">
          <div className="h-1 rounded-full transition-all" style={{ width: `${bar}%`, background: barColor }} />
        </div>
      )}
    </div>
  )
}
