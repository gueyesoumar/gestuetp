import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMissionDetail } from '../features/missions/useMissionDetail'
import { useAuditorAssessments } from '../features/missions/useAuditorAssessments'
import { useAllAssessments } from '../features/missions/useAllAssessments'
import { useMissionProgress } from '../features/missions/useMissionProgress'
import { useMissionUserRole } from '../features/missions/useMissionUserRole'
import { MissionDetailHeader } from '../features/missions/MissionDetailHeader'
import { MissionStepper } from '../features/missions/MissionStepper'
import { MissionOverviewTab } from '../features/missions/overview/MissionOverviewTab'
import { MissionScopingTab } from '../features/missions/scoping/MissionScopingTab'
import { MissionPlanningTab } from '../features/missions/planning/MissionPlanningTab'
import { MissionFieldworkTab } from '../features/missions/fieldwork/MissionFieldworkTab'
import { MissionReviewTab } from '../features/missions/review/MissionReviewTab'
import { MissionInternalReviewTab } from '../features/missions/internal-review/MissionInternalReviewTab'
import { MissionClientReviewTab } from '../features/missions/client-review/MissionClientReviewTab'
import { MissionClosureTab } from '../features/missions/closure/MissionClosureTab'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { CabinetClient } from '../types/database.types'

type TabKey = 'overview' | 'scoping' | 'planning' | 'fieldwork' | 'review' | 'internal_review' | 'client_review' | 'closure'

// Onglets interdits aux auditeurs (rôle non-lead, non-associate). Le RLS
// (migration 00091) bloque déjà les fuites de données ; cette liste cache
// les onglets dans la navigation et redirige si l'utilisateur tape l'URL.
const AUDITOR_FORBIDDEN_TABS: ReadonlySet<TabKey> = new Set(['scoping', 'planning', 'review', 'internal_review', 'client_review'])

export function MissionDetailPage(){
  const { id } = useParams<{ id: string }>()
  const { mission, members, assignments, domains, loading, error, refetch } = useMissionDetail(id)
  const userRole = useMissionUserRole(mission)
  const { assessments } = useAuditorAssessments(id)
  const { assessments: allAssessments } = useAllAssessments(id)
  // Pour les auditeurs, on restreint le calcul de progression aux contrôles
  // qui leur sont affectés. Sinon le stepper afficherait par exemple
  // "5/93" (mission complète) alors que l'auditeur n'a accès qu'à 61
  // contrôles, ce qui est trompeur.
  const progressScope = !userRole.isPrivileged && !userRole.loading ? userRole.assignedControlIds : undefined
  const progress = useMissionProgress(mission, allAssessments, domains, progressScope)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [cabinetClient, setCabinetClient] = useState<CabinetClient | null>(null)

  // Filtre les phases du Stepper pour les auditeurs.
  const visiblePhases = useMemo(() => {
    if (userRole.isPrivileged) return progress.phases
    return progress.phases.filter((p) => !AUDITOR_FORBIDDEN_TABS.has(p.key as TabKey))
  }, [progress.phases, userRole.isPrivileged])

  // Si l'utilisateur tape un onglet interdit dans l'URL ou navigue vers
  // un onglet sur lequel son rôle vient d'être réduit → repli sur Overview.
  useEffect(() => {
    if (userRole.loading) return
    if (!userRole.isPrivileged && AUDITOR_FORBIDDEN_TABS.has(activeTab)) {
      setActiveTab('overview')
    }
  }, [userRole.loading, userRole.isPrivileged, activeTab])

  // Fetch CabinetClient linked to this mission's client_id
  useEffect(() => {
    if (!mission?.client_id || !mission?.cabinet_id) return
    const ac = new AbortController()

    supabase
      .from('cabinet_clients')
      .select('*')
      .eq('cabinet_id', mission.cabinet_id)
      .eq('client_org_id', mission.client_id)
      .limit(1)
      .abortSignal(ac.signal)
      .then(({ data }) => {
        if (!ac.signal.aborted && data && data.length > 0) {
          setCabinetClient(data[0] as unknown as CabinetClient)
        }
      })

    return () => ac.abort()
  }, [mission?.client_id, mission?.cabinet_id])

  const handleCtaClick = useCallback(() => {
    if (progress.nextAction) {
      setActiveTab(progress.nextAction.tab as TabKey)
    }
  }, [progress.nextAction])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!mission) return <ErrorAlert message="Mission introuvable." />

  return (
    <div className="-m-7">
      <MissionDetailHeader mission={mission} progress={progress} onCtaClick={handleCtaClick} />
      <MissionStepper phases={visiblePhases} activeTab={activeTab} onTabChange={(t) => setActiveTab(t as TabKey)} />

      <div className="p-7">
        {activeTab === 'overview' && (
          <MissionOverviewTab mission={mission} members={members} assessments={assessments} domains={domains} progress={progress} onRefetch={refetch} />
        )}
        {activeTab === 'scoping' && userRole.isPrivileged && (
          <MissionScopingTab mission={mission} members={members} domains={domains} client={cabinetClient} onRefetch={refetch} />
        )}
        {activeTab === 'planning' && userRole.isPrivileged && (
          <MissionPlanningTab mission={mission} domains={domains} members={members} assignments={assignments} onRefetch={refetch} />
        )}
        {activeTab === 'fieldwork' && (
          <MissionFieldworkTab mission={mission} domains={domains} members={members} assignments={assignments} onRefetch={refetch} />
        )}
        {activeTab === 'review' && userRole.isPrivileged && (
          <MissionReviewTab mission={mission} />
        )}
        {activeTab === 'internal_review' && userRole.isPrivileged && (
          <MissionInternalReviewTab mission={mission} onStatusChange={refetch} />
        )}
        {activeTab === 'client_review' && userRole.isPrivileged && (
          <MissionClientReviewTab mission={mission} />
        )}
        {activeTab === 'closure' && (
          <MissionClosureTab mission={mission} onRefetch={refetch} />
        )}
      </div>
    </div>
  )
}
