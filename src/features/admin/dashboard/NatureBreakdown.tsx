interface Props {
  data: { cabinet: number; group: number; client: number; platform: number }
}

const ROWS: Array<{ key: keyof Props['data']; label: string; color: string }> = [
  { key: 'cabinet', label: 'Cabinets', color: 'bg-forest-500' },
  { key: 'group', label: 'Groupes / Régulateurs', color: 'bg-gold-500' },
  { key: 'client', label: 'Clients / Assujettis', color: 'bg-blue-500' },
  { key: 'platform', label: 'Plateforme', color: 'bg-gray-400' },
]

/** Répartition des organisations par nature (types canoniques). */
export function NatureBreakdown({ data }: Props) {
  const max = Math.max(data.cabinet, data.group, data.client, data.platform, 1)

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">Répartition par nature</span>
      </header>
      <div className="px-5 py-4 flex flex-col gap-3">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center gap-3 text-[12.5px]">
            <span className="w-40 text-gray-600 shrink-0">{r.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(data[r.key] / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right font-bold text-gray-900 tabular-nums">{data[r.key]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
