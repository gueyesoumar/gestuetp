import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'

interface PlanningGanttSectionProps {
  domains: DomainWithControls[]
  startDate: string | null
  endDate: string | null
}

const COLORS = ['#40916C', '#3B82F6', '#E07A5F', '#7B68EE', '#D4A843', '#6B7280']

export function PlanningGanttSection({ domains, startDate, endDate }: PlanningGanttSectionProps) {
  if (!startDate || !endDate) return null

  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
  const totalWeeks = Math.ceil(totalDays / 7)
  const totalControls = domains.reduce((s, d) => s + d.controls.length, 0)

  let cumulControls = 0

  return (
    <div className="p-4 border-b border-gray-200">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Calendrier par domaine</h4>

      <div className="flex mb-1.5 border-b border-gray-100 pb-1">
        <div className="w-8 shrink-0" />
        <div className="flex-1 flex">
          {Array.from({ length: Math.min(totalWeeks, 8) }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[9px] font-semibold text-gray-300 uppercase">S{i + 1}</div>
          ))}
        </div>
      </div>

      {domains.map((domain, i) => {
        const domainControls = domain.controls.length
        const domainPct = totalControls > 0 ? (domainControls / totalControls) * 100 : 0
        const leftPct = totalControls > 0 ? (cumulControls / totalControls) * 100 : 0
        const widthPct = Math.min(domainPct * 1.2, 100 - leftPct)
        cumulControls += domainControls

        return (
          <div key={domain.id} className="flex items-center gap-1.5 mb-1.5">
            <span className="w-8 text-[10px] font-mono text-gray-500 shrink-0">{domain.code}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded relative">
              <div
                className="absolute top-0 h-4 rounded flex items-center px-1 text-[8px] font-semibold text-white overflow-hidden whitespace-nowrap"
                style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: COLORS[i % COLORS.length] }}
              >
                {domainControls} ctrl
              </div>
            </div>
          </div>
        )
      })}

      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-gray-300">{formatShort(startDate)}</span>
        <span className="text-[9px] text-gray-300">{formatShort(endDate)}</span>
      </div>
    </div>
  )
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
