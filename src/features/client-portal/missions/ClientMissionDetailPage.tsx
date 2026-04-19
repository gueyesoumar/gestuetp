import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClientMissionDetail } from './useClientMissionDetail'
import { ClientMissionDashboardTab } from './tabs/ClientMissionDashboardTab'
import { ClientExchangesTab } from './tabs/ClientExchangesTab'
import { ClientResultsTab } from './tabs/ClientResultsTab'
import { ClientReportsTab } from './tabs/ClientReportsTab'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { CLIENT_TABS } from '../client-constants'
import type { ClientTabKey } from '../client-constants'

export function ClientMissionDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mission, permission, loading, error, refetch } = useClientMissionDetail(id)
  const [activeTab, setActiveTab] = useState<ClientTabKey>('dashboard')

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!mission) return <ErrorAlert message="Mission introuvable." />

  const isContributor = permission === 'contributor'

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/client/missions')} className="text-xs text-forest-700 hover:text-forest-900 mb-3 flex items-center gap-1">
        {'\u2190'} Retour aux missions
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold">{mission.name}</h1>
          <div className="flex gap-3 mt-1 text-xs text-gray-300">
            {mission.cabinet_name && <span>{'\uD83C\uDFE2'} {mission.cabinet_name}</span>}
            {mission.framework_name && <span>{'\uD83D\uDCC4'} {mission.framework_name}</span>}
            {mission.start_date && <span>{'\uD83D\uDCC5'} {formatDate(mission.start_date)}{mission.end_date ? ` \u2192 ${formatDate(mission.end_date)}` : ''}</span>}
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-forest-50 text-forest-700">
          {mission.status_label}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {CLIENT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
              activeTab === tab.key
                ? 'bg-forest-700 text-white border-forest-700'
                : 'bg-white text-gray-500 border-gray-200 hover:border-forest-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && (
        <ClientMissionDashboardTab mission={mission} />
      )}
      {activeTab === 'exchanges' && (
        <ClientExchangesTab mission={mission} isContributor={isContributor} onRefetch={refetch} />
      )}
      {activeTab === 'results' && (
        <ClientResultsTab mission={mission} isContributor={isContributor} onRefetch={refetch} />
      )}
      {activeTab === 'reports' && (
        <ClientReportsTab mission={mission} />
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
