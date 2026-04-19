import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMissionDetail } from '../features/missions/useMissionDetail'
import { useAuditorAssessments } from '../features/missions/useAuditorAssessments'
import { useAllAssessments } from '../features/missions/useAllAssessments'
import { useMissionProgress } from '../features/missions/useMissionProgress'
import { MissionDetailHeader } from '../features/missions/MissionDetailHeader'
import { MissionStepper } from '../features/missions/MissionStepper'
import { MissionOverviewTab } from '../features/missions/overview/MissionOverviewTab'
import { MissionScopingTab } from '../features/missions/scoping/MissionScopingTab'
import { MissionPlanningTab } from '../features/missions/planning/MissionPlanningTab'
import { MissionFieldworkTab } from '../features/missions/fieldwork/MissionFieldworkTab'
import { MissionReviewTab } from '../features/missions/review/MissionReviewTab'
import { MissionClientReviewTab } from '../features/missions/client-review/MissionClientReviewTab'
import { MissionClosureTab } from '../features/missions/closure/MissionClosureTab'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { CabinetClient } from '../types/database.types'

type TabKey = 'overview' | 'scoping' | 'planning' | 'fieldwork' | 'review' | 'client_review' | 'closure'

export function MissionDetailPage(){
  const { id } = useParams<{ id: string }>()
  const { mission, members, assignments, domains, loading, error, refetch } = useMissionDetail(id)
  const { assessments } = useAuditorAssessments(id)
  const { assessments: allAssessments } = useAllAssessments(id)
  const progress = useMissionProgress(mission, allAssessments, domains)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [cabinetClient, setCabinetClient] = useState<CabinetClient | null>(null)

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
      <MissionStepper phases={progress.phases} activeTab={activeTab} onTabChange={(t) => setActiveTab(t as TabKey)} />

      <div className="p-7">
        {activeTab === 'overview' && (
          <MissionOverviewTab mission={mission} members={members} assessments={assessments} domains={domains} progress={progress} onRefetch={refetch} />
        )}
        {activeTab === 'scoping' && (
          <MissionScopingTab mission={mission} members={members} domains={domains} client={cabinetClient} onRefetch={refetch} />
        )}
        {activeTab === 'planning' && (
          <MissionPlanningTab mission={mission} domains={domains} members={members} assignments={assignments} onRefetch={refetch} />
        )}
        {activeTab === 'fieldwork' && (
          <MissionFieldworkTab mission={mission} domains={domains} members={members} assignments={assignments} onRefetch={refetch} />
        )}
        {activeTab === 'review' && (
          <MissionReviewTab mission={mission} />
        )}
        {activeTab === 'client_review' && (
          <MissionClientReviewTab mission={mission} />
        )}
        {activeTab === 'closure' && (
          <MissionClosureTab mission={mission} onRefetch={refetch} />
        )}
      </div>
    </div>
  )
}
