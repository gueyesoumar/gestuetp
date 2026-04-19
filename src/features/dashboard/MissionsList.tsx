import { Badge } from '../../components/ui/Badge'
import type { MissionSummary } from './useDashboardStats'
import type { MissionStatus } from '../../types/database.types'

const statusBadge: Record<string, { label: string; variant: 'forest' | 'gold' | 'green' | 'gray' }> = {
  initialization: { label: 'Init.', variant: 'gray' },
  scoping: { label: 'Cadrage', variant: 'gray' },
  planning: { label: 'Planif.', variant: 'forest' },
  fieldwork: { label: 'Travaux', variant: 'forest' },
  internal_review: { label: 'Revue', variant: 'gold' },
  client_review: { label: 'Client', variant: 'gold' },
  closure: { label: 'Cl\u00f4tur\u00e9e', variant: 'green' },
}

interface MissionsListProps {
  missions: MissionSummary[]
}

export function MissionsList({ missions }: MissionsListProps) {
  if (missions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h4 className="text-[14px] font-bold text-gray-900 mb-3">Missions en cours</h4>
        <p className="text-[13px] text-gray-400">Aucune mission active.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h4 className="text-[14px] font-bold text-gray-900 mb-3">Missions en cours</h4>
      <div>
        {missions.map((m) => {
          const pct = m.totalControls > 0 ? Math.round((m.evaluatedControls / m.totalControls) * 100) : 0
          const badge = statusBadge[m.status] ?? statusBadge.initialization
          const barColor = m.status === 'internal_review' || m.status === 'client_review'
            ? 'bg-gold-500'
            : m.status === 'fieldwork' || m.status === 'planning'
              ? 'bg-forest-500'
              : 'bg-gray-300'

          return (
            <div key={m.id} className="py-3.5 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-gray-900">{m.name}</div>
                <Badge label={badge.label} variant={badge.variant} />
              </div>
              <div className="text-[12px] text-gray-300 mt-0.5">{m.clientName}</div>
              <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-gray-300 mt-1">
                {m.evaluatedControls}/{m.totalControls} contr&ocirc;les
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
