interface Props {
  data: number[]
}

/**
 * Activité plateforme sur 14 jours — barres verticales (flex, sans distorsion SVG).
 * Endpoint (aujourd'hui) mis en avant en or.
 */
export function ActivityChart({ data }: Props) {
  const max = Math.max(...data, 1)
  const total = data.reduce((a, b) => a + b, 0)
  const last = data.length - 1

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">Activité plateforme · 14 jours</span>
        <span className="ml-auto text-[11px] text-gray-400 tabular-nums">{total} mission(s) touchée(s)</span>
      </header>
      <div className="px-5 pt-5 pb-2 h-[180px] flex items-end gap-1.5">
        {data.map((value, idx) => (
          <div
            key={idx}
            className={`flex-1 rounded-t-md transition-all ${idx === last ? 'bg-gold-500' : 'bg-forest-500/80 hover:bg-forest-500'}`}
            style={{ height: `${(value / max) * 100}%`, minHeight: '3px' }}
            title={`J-${last - idx} : ${value} mission(s) modifiée(s)`}
          />
        ))}
      </div>
      <div className="flex justify-between px-5 pb-3 text-[10px] text-gray-400 tabular-nums">
        <span>J-{last}</span>
        <span>aujourd&apos;hui</span>
      </div>
    </section>
  )
}
