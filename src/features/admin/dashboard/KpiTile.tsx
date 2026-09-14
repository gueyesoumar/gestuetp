type Accent = 'gold' | 'green' | 'blue' | 'purple'

const ACCENT: Record<Accent, string> = {
  gold: 'bg-gold-500',
  green: 'bg-forest-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
}

interface Props {
  label: string
  value: string
  sub?: string
  delta?: string
  accent: Accent
  tooltip?: string
}

export function KpiTile({ label, value, sub, delta, accent, tooltip }: Props) {
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl px-5 py-4 overflow-hidden" title={tooltip}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${ACCENT[accent]}`} />
      <div className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[26px] font-extrabold text-gray-900 tracking-tight tabular-nums">{value}</span>
        {delta && <span className="text-[11.5px] font-bold text-forest-700">{delta}</span>}
      </div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}
