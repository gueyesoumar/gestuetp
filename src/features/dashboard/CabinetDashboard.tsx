import { useState } from 'react'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useDashboardStats } from './useDashboardStats'
import { useDashboardViews } from './useDashboardViews'
import { DashboardViewSwitcher } from './DashboardViewSwitcher'
import { ExecutiveDashboard } from './ExecutiveDashboard'
import { PilotageDashboard } from './PilotageDashboard'
import { OperationnelDashboard } from './OperationnelDashboard'
import { useAuth } from '../../hooks/useAuth'
import type { DashboardView } from '../../types/database.types'

const VIEW_DESCRIPTIONS: Record<DashboardView, string> = {
  executive: "Vue d'ensemble de l'activit\u00e9 du cabinet",
  pilotage: "Suivi de vos missions et de votre \u00e9quipe",
  operationnel: "Vos contr\u00f4les et vos t\u00e2ches du jour",
}

export function CabinetDashboard(): JSX.Element {
  const { profile } = useAuth()
  const { stats, missions, nearestDeadline, priorityMission, loading: statsLoading, error } = useDashboardStats()
  const { allowedViews, defaultView, loading: viewsLoading } = useDashboardViews()
  const [activeView, setActiveView] = useState<DashboardView | null>(null)

  const loading = statsLoading || viewsLoading
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const currentView = activeView ?? defaultView
  const firstName = profile?.first_name ?? ''

  return (
    <div>
      {/* Header */}
      <div className="mb-1">
        <h1 className="text-xl font-semibold text-gray-900">Bonjour, {firstName}</h1>
        <p className="mt-1 text-[13px] text-gray-500">{VIEW_DESCRIPTIONS[currentView]}</p>
      </div>

      {/* View switcher */}
      <DashboardViewSwitcher
        allowedViews={allowedViews}
        activeView={currentView}
        onSwitch={setActiveView}
      />

      {/* Active view */}
      {currentView === 'executive' && (
        <ExecutiveDashboard stats={stats} missions={missions} nearestDeadline={nearestDeadline} />
      )}
      {currentView === 'pilotage' && (
        <PilotageDashboard stats={stats} missions={missions} />
      )}
      {currentView === 'operationnel' && (
        <OperationnelDashboard stats={stats} missions={missions} />
      )}
    </div>
  )
}
