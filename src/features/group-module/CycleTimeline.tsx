import { Check } from 'lucide-react'
import type { SupervisionCycle } from '../../types/database.types'

interface CycleTimelineProps {
  cycles: SupervisionCycle[]
  onClose?: (cycleId: string) => void | Promise<void> | Promise<boolean>
  busy?: boolean
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function CycleTimeline({ cycles, onClose, busy }: CycleTimelineProps): JSX.Element {
  if (cycles.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">Aucun cycle planifié pour cette supervision.</p>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-[14px] h-0.5 bg-gray-200" />
      <div className={`relative grid gap-3`} style={{ gridTemplateColumns: `repeat(${cycles.length}, minmax(0, 1fr))` }}>
        {cycles.map((c) => {
          const isClosed = c.status === 'closed'
          const isInProgress = c.status === 'in_progress'
          const dotClass = isClosed
            ? 'bg-green-600 text-white'
            : isInProgress
            ? 'bg-amber-500 text-forest-900 ring-4 ring-amber-100'
            : 'bg-white border-2 border-gray-300 text-gray-400'
          const containerClass = isClosed
            ? 'border-green-200 bg-green-50'
            : isInProgress
            ? 'border-2 border-amber-500 bg-amber-50'
            : 'border-dashed border-gray-300 text-gray-400'

          return (
            <div key={c.id} className="relative">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] relative z-10 ${dotClass}`}>
                {isClosed ? <Check size={13} /> : isInProgress ? '•' : ''}
              </div>
              <div className={`border rounded-lg p-3 mt-2 ${containerClass}`}>
                <p className="font-bold text-[12px] text-gray-900">{c.period_label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(c.period_start)} → {formatDate(c.period_end)}</p>
                {isClosed && c.score !== null && (
                  <p className="text-[12px] mt-2"><strong>{c.score}%</strong> conformité</p>
                )}
                {isInProgress && (
                  <p className="text-[11px] text-amber-800 font-semibold mt-2">En cours</p>
                )}
                {c.status === 'planned' && (
                  <p className="text-[10px] text-gray-400 italic mt-2">Planifié</p>
                )}
                {isInProgress && onClose && (
                  <button
                    onClick={() => void onClose(c.id)}
                    disabled={busy}
                    className="mt-2 w-full text-[11px] font-semibold bg-amber-500 text-forest-900 rounded px-2 py-1.5 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {busy ? 'Clôture…' : 'Clôturer cette revue'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
