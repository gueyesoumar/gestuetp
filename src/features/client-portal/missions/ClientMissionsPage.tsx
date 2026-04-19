import { useState } from 'react'
import { useClientMissions } from '../useClientMissions'
import { ClientMissionCard } from './ClientMissionCard'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'

export function ClientMissionsPage(): JSX.Element {
  const [cabinetFilter, setCabinetFilter] = useState<string | undefined>()
  const { missions, loading, error } = useClientMissions(cabinetFilter)

  const cabinets = [...new Map(missions.map((m) => [m.cabinet_id, m.cabinet_name])).entries()]

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Mes missions</h1>
      <p className="text-sm text-gray-400 mb-5">
        Toutes vos missions d{'\u2019'}audit, tous cabinets confondus
      </p>

      {/* Cabinet filter */}
      {cabinets.length > 1 && (
        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => setCabinetFilter(undefined)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              !cabinetFilter ? 'bg-forest-700 text-white border-forest-700' : 'bg-white text-gray-500 border-gray-200 hover:border-forest-300'
            }`}
          >
            Tous ({missions.length})
          </button>
          {cabinets.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setCabinetFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                cabinetFilter === id ? 'bg-forest-700 text-white border-forest-700' : 'bg-white text-gray-500 border-gray-200 hover:border-forest-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {missions.map((m) => (
          <ClientMissionCard key={m.id} mission={m} />
        ))}
      </div>

      {missions.length === 0 && (
        <div className="text-center py-16 text-gray-300 text-sm">
          Aucune mission trouv{'\u00e9'}e.
        </div>
      )}
    </div>
  )
}
