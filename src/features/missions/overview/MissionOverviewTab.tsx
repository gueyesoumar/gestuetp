import { useMemo } from 'react'
import { TeamActivityPanel } from './TeamActivityPanel'
import { useMissionUserRole } from '../useMissionUserRole'
import { useMissionFindingsCount } from '../useMissionFindingsCount'
import { EmptyState } from '../../../components/ui/EmptyState'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { InfoPopover } from '../../../components/ui/InfoPopover'
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

export function MissionOverviewTab({ mission, members, assessments, progress, onRefetch }: MissionOverviewTabProps) {
  const userRole = useMissionUserRole(mission)

  // Constats : scopés comme les autres KPI (auditeur restreint = ses contrôles).
  const scopedAssessmentIds = useMemo(() => {
    const inScope = userRole.isPrivileged || userRole.loading
      ? assessments
      : assessments.filter((a) => userRole.assignedControlIds.has(a.control_id))
    return inScope.map((a) => a.id)
  }, [assessments, userRole.isPrivileged, userRole.loading, userRole.assignedControlIds])
  const findingsCount = useMissionFindingsCount(scopedAssessmentIds)

  // Tant que le rôle de l'utilisateur sur la mission n'est pas résolu, on n'affiche
  // NI la vue normale NI l'état vide : sinon un auditeur restreint voit une fraction
  // de seconde la vue d'ensemble complète avant de basculer sur « aucun contrôle ».
  if (userRole.loading) return <LoadingSpinner />

  if (userRole.isAuditor && userRole.assignedControlIds.size === 0) {
    return (
      <EmptyState
        title="Aucun contrôle affecté"
        description="Le chef de mission ne vous a pas encore affecté de contrôle dans cette mission."
      />
    )
  }

  const conformityFinal = mission.status === 'closure'
  const daysLate = progress.daysRemaining !== null && progress.daysRemaining < 0

  return (
    <div className="space-y-6">

      {/* 4 KPIs de d\u00e9cision */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Avancement"
          value={`${progress.overallPercent}%`}
          color="var(--color-forest-700)"
          bar={progress.overallPercent}
          barColor="#40916C"
          sub={`${progress.assessedControls}/${progress.totalControls} contr\u00f4les \u00e9valu\u00e9s`}
          info="Avancement de la mission : position dans les phases du moteur (5 pour le Contr\u00f4le, 6 pour l\u2019Audit) combin\u00e9e au taux de contr\u00f4les \u00e9valu\u00e9s."
        />
        <KpiCard
          label="Conformit\u00e9"
          value={`${progress.conformityScore}%`}
          color="var(--color-success)"
          sub={conformityFinal ? `sur ${progress.assessedControls} \u00e9valu\u00e9s` : `provisoire \u00b7 sur ${progress.assessedControls} \u00e9valu\u00e9s`}
          info="Score pond\u00e9r\u00e9 sur les contr\u00f4les \u00e9valu\u00e9s : conforme 100, largement 75, partiellement 50, non conforme 0. Les non applicables et non \u00e9valu\u00e9s sont exclus."
        />
        <KpiCard
          label="\u00c9ch\u00e9ance"
          value={progress.daysRemaining !== null ? `${Math.abs(progress.daysRemaining)} j` : '\u2014'}
          color={daysLate ? 'var(--color-error)' : 'var(--color-forest-700)'}
          sub={progress.daysRemaining === null ? 'sans date de fin' : daysLate ? 'de retard' : 'restants'}
          info="Jours avant (ou apr\u00e8s) la date de fin pr\u00e9vue de la mission."
        />
        <KpiCard
          label="Constats"
          value={findingsCount === null ? '\u2026' : `${findingsCount}`}
          color="var(--color-gold-600)"
          sub="relev\u00e9s"
          info="Nombre de constats relev\u00e9s sur les contr\u00f4les de la mission, toutes classifications confondues (majeur, mineur, observation, point fort)."
        />
      </div>

      {/* \u00c9quipe + Activit\u00e9 r\u00e9cente */}
      <TeamActivityPanel
        missionId={mission.id}
        members={members}
        leadAuditorId={mission.lead_auditor_user?.id ?? null}
        associateId={mission.associate_user?.id ?? null}
        onRefetch={onRefetch}
      />
    </div>
  )
}

function KpiCard({ label, value, color, sub, bar, barColor, info }: {
  label: string; value: string; color: string; sub?: string; bar?: number; barColor?: string; info?: string
}){
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between gap-1 mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        {info && <InfoPopover text={info} />}
      </div>
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
