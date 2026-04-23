import { Check } from 'lucide-react'

const PHASES = [
  { key: 'scoping', label: 'Cadrage' },
  { key: 'planning', label: 'Planification' },
  { key: 'fieldwork', label: 'Travaux terrain' },
  { key: 'internal_review', label: 'Revue interne' },
  { key: 'client_review', label: 'Validation client' },
  { key: 'closure', label: 'Restitution' },
]

const STATUS_TO_INDEX: Record<string, number> = {
  initialization: -1,
  scoping: 0,
  planning: 1,
  fieldwork: 2,
  internal_review: 3,
  client_review: 4,
  closure: 5,
}

interface ClientMissionTimelineProps {
  status: string
  startDate: string | null
  endDate: string | null
}

export function ClientMissionTimeline({ status, startDate, endDate }: ClientMissionTimelineProps): JSX.Element {
  const currentIdx = STATUS_TO_INDEX[status] ?? -1

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
          <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
        </svg>
        <span className="text-[13px] font-semibold text-gray-700">Chronologie de la mission</span>
      </div>
      <div className="flex flex-col gap-0 relative pl-5">
        {PHASES.map((phase, i) => {
          const isDone = i < currentIdx
          const isActive = i === currentIdx
          const isLast = i === PHASES.length - 1

          return (
            <div key={phase.key} className="relative pb-6 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className="absolute left-[-14px] top-[14px] w-0.5 h-full"
                  style={{ background: isDone ? 'var(--color-success)' : 'var(--color-gray-200, #E5E7EB)' }}
                />
              )}
              {/* Dot */}
              <div className="absolute left-[-20px] top-[2px]">
                {isDone ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-green-600 flex items-center justify-center">
                    <Check size={9} className="text-white" strokeWidth={3} />
                  </div>
                ) : isActive ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-forest-700" style={{ boxShadow: '0 0 0 4px var(--color-forest-100)' }} />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-200" />
                )}
              </div>
              {/* Label */}
              <div>
                <p className={`text-[13px] font-semibold ${
                  isDone ? 'text-green-600' : isActive ? 'text-forest-700' : 'text-gray-300'
                }`}>
                  {phase.label}
                </p>
                <p className={`text-[11px] mt-0.5 ${
                  isDone ? 'text-green-500' : isActive ? 'text-forest-500' : 'text-gray-300'
                }`}>
                  {isDone ? 'Termin\u00e9' : isActive ? 'En cours' : '\u00c0 venir'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {/* Date range */}
      {(startDate || endDate) && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {startDate && formatDate(startDate)}
          {startDate && endDate && ' \u2192 '}
          {endDate && formatDate(endDate)}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
