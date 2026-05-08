interface QuotaInlineBarProps {
  icon: JSX.Element
  label: string
  current: number
  max: number | null
  onWarning?: string
  onCritical?: string
}

type UsageState = 'unlimited' | 'safe' | 'warning' | 'critical' | 'over'

function computeUsage(current: number, max: number | null): UsageState {
  if (max === null) return 'unlimited'
  if (current > max) return 'over'
  const ratio = max === 0 ? 1 : current / max
  if (ratio >= 0.9) return 'critical'
  if (ratio >= 0.7) return 'warning'
  return 'safe'
}

export function QuotaInlineBar({ icon, label, current, max, onWarning, onCritical }: QuotaInlineBarProps): JSX.Element {
  const state = computeUsage(current, max)
  const ratio = max === null || max === 0 ? 0 : Math.min(1, current / max)
  const widthPct = Math.round(ratio * 100)
  const colors = {
    unlimited: { bar: 'bg-gray-200', text: 'text-gray-500' },
    safe:      { bar: 'bg-emerald-500', text: 'text-emerald-700' },
    warning:   { bar: 'bg-amber-500', text: 'text-amber-700' },
    critical:  { bar: 'bg-red-500', text: 'text-red-700' },
    over:      { bar: 'bg-red-600', text: 'text-red-700' },
  }[state]

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 inline-flex items-center gap-3 min-w-[220px]">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11.5px] text-gray-700">{label}</span>
          <span className={`text-[11.5px] font-mono font-semibold ${colors.text}`}>
            {current} {max === null ? '/ ∞' : `/ ${max}`}
          </span>
        </div>
        {max !== null && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${colors.bar}`}
              style={{ width: state === 'over' ? '100%' : `${widthPct}%` }}
            />
          </div>
        )}
        {state === 'over' && (
          <p className="text-[10px] text-red-600 mt-1">⚠ Cabinet en surcapacité</p>
        )}
        {state === 'critical' && onCritical && (
          <p className="text-[10px] text-red-600 mt-1">{onCritical}</p>
        )}
        {state === 'warning' && onWarning && (
          <p className="text-[10px] text-amber-600 mt-1">{onWarning}</p>
        )}
      </div>
    </div>
  )
}

export function isQuotaReached(current: number, max: number | null): boolean {
  return max !== null && current >= max
}
