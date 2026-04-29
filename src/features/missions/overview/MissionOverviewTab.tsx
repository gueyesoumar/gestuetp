import { useMemo } from 'react'
import { DomainProgressList } from './DomainProgressList'
import { TeamActivityPanel } from './TeamActivityPanel'
import { EvidenceTracker } from './EvidenceTracker'
import { useMissionDocuments } from '../useMissionDocuments'
import { useMissionUserRole } from '../useMissionUserRole'
import { EmptyState } from '../../../components/ui/EmptyState'
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

export function MissionOverviewTab({ mission, members, assessments, domains, progress, onRefetch }: MissionOverviewTabProps) {
  const { documents } = useMissionDocuments(mission.id)
  const userRole = useMissionUserRole(mission)

  // Pour les auditeurs : ne montrer que les contr\u00f4les affect\u00e9s.
  const filteredDomains = useMemo(() => {
    if (userRole.isPrivileged || userRole.loading) return domains
    return domains
      .map((d) => ({ ...d, controls: d.controls.filter((c) => userRole.assignedControlIds.has(c.id)) }))
      .filter((d) => d.controls.length > 0)
  }, [domains, userRole.isPrivileged, userRole.loading, userRole.assignedControlIds])

  // Idem pour les KPI : un auditeur ne voit que sa propre progression.
  const localProgress = useMemo(() => {
    if (userRole.isPrivileged || userRole.loading) return progress
    const filteredTotal = filteredDomains.reduce((s, d) => s + d.controls.length, 0)
    const filteredAssessments = assessments.filter((a) => userRole.assignedControlIds.has(a.control_id))
    const submitted = filteredAssessments.filter((a) => a.status === 'submitted' || a.status === 'in_review' || a.status === 'approved').length
    const approved = filteredAssessments.filter((a) => a.status === 'approved').length
    return {
      ...progress,
      totalControls: filteredTotal,
      assessedControls: filteredAssessments.length,
      submittedControls: submitted,
      approvedControls: approved,
      overallPercent: filteredTotal > 0 ? Math.round((submitted / filteredTotal) * 100) : 0,
    }
  }, [progress, assessments, filteredDomains, userRole.isPrivileged, userRole.loading, userRole.assignedControlIds])

  if (userRole.isAuditor && !userRole.loading && userRole.assignedControlIds.size === 0) {
    return (
      <EmptyState
        title="Aucun contr\u00f4le affect\u00e9"
        description="Le chef de mission ne vous a pas encore affect\u00e9 de contr\u00f4le dans cette mission."
      />
    )
  }

  return (
    <div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Progression globale" value={`${localProgress.overallPercent}%`} color="var(--color-forest-700)" bar={localProgress.overallPercent} barColor="#40916C" />
        <KpiCard label="Contr&ocirc;les &eacute;valu&eacute;s" value={`${localProgress.assessedControls}/${localProgress.totalControls}`} color="var(--color-gold-500)" sub={`${localProgress.submittedControls} soumis \u00b7 ${localProgress.approvedControls} approuv\u00e9s`} />
        <KpiCard label="Score provisoire" value={`${localProgress.provisionalScore}%`} color="var(--color-success)" sub={`Bas\u00e9 sur ${localProgress.assessedControls} contr\u00f4les`} />
        <KpiCard label="Jours restants" value={localProgress.daysRemaining !== null ? `${localProgress.daysRemaining}` : '\u2014'} color="var(--color-forest-700)" />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <DomainProgressList domains={filteredDomains} assessments={assessments} />
          <EvidenceTracker missionId={mission.id} domains={filteredDomains} documents={documents} />
        </div>
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
