import { InsightsBriefing } from './InsightsBriefing'
import { SmartCards } from './SmartCards'
import { ClientPortfolio } from './ClientPortfolio'
import { ActionCenter } from './ActionCenter'
import { WeeklyPulse } from './WeeklyPulse'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useDashboardStats } from './useDashboardStats'
import { useAuth } from '../../hooks/useAuth'

export function CabinetDashboard(): JSX.Element {
  const { profile } = useAuth()
  const { stats, missions, nearestDeadline, priorityMission, loading, error } = useDashboardStats()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const firstName = profile?.first_name ?? ''

  return (
    <div className="space-y-5">
      <InsightsBriefing name={firstName} stats={stats} />

      <SmartCards
        stats={stats}
        nearestDeadline={nearestDeadline}
        priorityMission={priorityMission}
      />

      <ClientPortfolio missions={missions} />

      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-4">
        <ActionCenter stats={stats} missions={missions} />
        <WeeklyPulse />
      </div>
    </div>
  )
}
