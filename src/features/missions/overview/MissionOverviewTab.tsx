import { useMemo } from 'react'
import { TeamActivityPanel } from './TeamActivityPanel'
import { ValidationsDigestCard } from './ValidationsDigestCard'
import { ExceptionsDigestCard } from './ExceptionsDigestCard'
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
  onGoToTab?: (tab: string) => void
}

export function MissionOverviewTab({ mission, members, assessments, progress, onRefetch, onGoToTab }: MissionOverviewTabProps) {
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

      {/* 4 KPIs de décision */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Avancement"
          value={`${progress.overallPercent}%`}
          color="var(--color-forest-700)"
          bar={progress.overallPercent}
          barColor="#40916C"
          sub={`${progress.assessedControls}/${progress.totalControls} contrôles évalués`}
          info="Avancement de la mission : position dans les phases du moteur (5 pour le Contrôle, 6 pour l’Audit) combinée au taux de contrôles évalués."
        />
        <KpiCard
          label="Conformité"
          value={`${progress.conformityScore}%`}
          color="var(--color-success)"
          sub={conformityFinal ? `sur ${progress.assessedControls} évalués` : `provisoire · sur ${progress.assessedControls} évalués`}
          info="Score pondéré sur les contrôles évalués : conforme 100, largement 75, partiellement 50, non conforme 0. Les non applicables et non évalués sont exclus."
        />
        <KpiCard
          label="Échéance"
          value={progress.daysRemaining !== null ? `${Math.abs(progress.daysRemaining)} j` : '—'}
          color={daysLate ? 'var(--color-error)' : 'var(--color-forest-700)'}
          sub={progress.daysRemaining === null ? 'sans date de fin' : daysLate ? 'de retard' : 'restants'}
          info="Jours avant (ou après) la date de fin prévue de la mission."
        />
        <KpiCard
          label="Constats"
          value={findingsCount === null ? '…' : `${findingsCount}`}
          color="var(--color-gold-600)"
          sub="relevés"
          info="Nombre de constats relevés sur les contrôles de la mission, toutes classifications confondues (majeur, mineur, observation, point fort)."
        />
      </div>

      {/* Dossiers d'action (chef de mission / associé) */}
      {onGoToTab && <ValidationsDigestCard mission={mission} onOpen={() => onGoToTab('review')} />}
      {onGoToTab && userRole.isPrivileged && (
        <ExceptionsDigestCard missionId={mission.id} onOpen={() => onGoToTab('scoping')} />
      )}

      {/* Équipe + Activité récente */}
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
