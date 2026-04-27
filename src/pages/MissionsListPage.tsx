import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMissions } from '../features/missions/useMissions'
import { useCabinetPermissions } from '../hooks/useCabinetPermissions'
import { MissionsKanbanView } from '../features/missions/views/MissionsKanbanView'
import { MissionsCardsView } from '../features/missions/views/MissionsCardsView'
import { MissionsSplitView } from '../features/missions/views/MissionsSplitView'
import { ViewSwitch } from '../components/ui/ViewSwitch'
import type { ViewMode } from '../components/ui/ViewSwitch'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { EmptyState } from '../components/ui/EmptyState'

type FilterKey = 'all' | 'active' | 'closed'

export function MissionsListPage() {
  const { missions, loading, error } = useMissions()
  const { canCreateMission } = useCabinetPermissions()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<ViewMode>(() => {
    return (localStorage.getItem('gestu-missions-view') as ViewMode) || 'kanban'
  })

  useEffect(() => {
    localStorage.setItem('gestu-missions-view', view)
  }, [view])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const activeCount = missions.filter((m) => m.status !== 'closure').length
  const closedCount = missions.filter((m) => m.status === 'closure').length
  const filtered = filter === 'all' ? missions : filter === 'active' ? missions.filter((m) => m.status !== 'closure') : missions.filter((m) => m.status === 'closure')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Missions</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            Gérez vos missions d'audit et de conformité.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewSwitch value={view} onChange={setView} />
          {canCreateMission && (
            <Link
              to="/missions/nouvelle"
              className="rounded-lg bg-forest-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900 transition-colors"
            >
              + Nouvelle mission
            </Link>
          )}
        </div>
      </div>

      {missions.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucune mission"
            description="Créez votre première mission pour commencer."
            action={
              canCreateMission ? (
                <Link to="/missions/nouvelle" className="rounded-lg bg-forest-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900">
                  + Nouvelle mission
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="mt-4 mb-5">
            <div className="inline-flex bg-white border border-gray-200 rounded-[10px] p-[3px]">
              <FilterTab label="Toutes" count={missions.length} active={filter === 'all'} onClick={() => setFilter('all')} />
              <FilterTab label="Actives" count={activeCount} active={filter === 'active'} onClick={() => setFilter('active')} />
              <FilterTab label="Clôturées" count={closedCount} active={filter === 'closed'} onClick={() => setFilter('closed')} />
            </div>
          </div>

          {/* View */}
          {view === 'kanban' && <MissionsKanbanView missions={filtered} />}
          {view === 'cards' && <MissionsCardsView missions={filtered} />}
          {view === 'split' && <MissionsSplitView missions={filtered} />}
        </>
      )}
    </div>
  )
}

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
        active ? 'bg-forest-700 text-white font-semibold' : 'text-gray-500 hover:text-forest-700'
      }`}
    >
      {label}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  )
}
