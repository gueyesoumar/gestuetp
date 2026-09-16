interface Props {
  data: { comply: number; risk: number; policy: number }
  totalOrgs: number
}

const ROWS: Array<{ key: keyof Props['data']; label: string; color: string }> = [
  { key: 'comply', label: 'Comply', color: 'bg-forest-500' },
  { key: 'risk', label: 'Risk', color: 'bg-[#E07A5F]' },
  { key: 'policy', label: 'Policy', color: 'bg-[#7B68EE]' },
]

/** Adoption des modules — nb d'organisations ayant la capacité active. */
export function ModuleAdoption({ data, totalOrgs }: Props) {
  const base = Math.max(totalOrgs, 1)
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <span className="text-[13px] font-bold text-gray-900">Adoption des modules</span>
      </header>
      <div className="px-5 py-4 flex flex-col gap-3">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center gap-3 text-[12.5px]">
            <span className="w-16 text-gray-600 shrink-0">{r.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(data[r.key] / base) * 100}%` }} />
            </div>
            <span className="w-8 text-right font-bold text-gray-900 tabular-nums">{data[r.key]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
