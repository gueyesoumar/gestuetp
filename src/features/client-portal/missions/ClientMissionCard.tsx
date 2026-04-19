import { useNavigate } from 'react-router-dom'
import { PHASE_LABELS } from '../../missions/mission-constants'
import type { ClientMission } from '../useClientMissions'

interface ClientMissionCardProps {
  mission: ClientMission
}

export function ClientMissionCard({ mission }: ClientMissionCardProps): JSX.Element {
  const navigate = useNavigate()
  const phaseLabel = PHASE_LABELS[mission.status] ?? mission.status

  return (
    <div
      onClick={() => navigate(`/client/missions/${mission.id}`)}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer transition-all hover:border-forest-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{mission.name}</p>
          <div className="flex gap-2 mt-1 text-[10px] text-gray-300">
            {mission.start_date && <span>{'\uD83D\uDCC5'} {formatDate(mission.start_date)}</span>}
            {mission.framework_name && <span>{'\uD83D\uDCC4'} {mission.framework_name}</span>}
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-forest-50 text-forest-700 shrink-0">
          {phaseLabel}
        </span>
      </div>

      {mission.cabinet_name && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded mt-1">
          {'\uD83C\uDFE2'} {mission.cabinet_name}
        </span>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
