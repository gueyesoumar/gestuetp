import type { ReactNode } from 'react'
import type { RadarView, RiskQuadrant } from './riskRadarQuadrants'

const VIEW_NOUN: Record<RadarView, string> = { sector: 'les secteurs', org: 'les assujettis', vital: 'les infrastructures vitales' }

/** Panneau latéral du radar : liste détaillée du quadrant sélectionné (n°B). */
export function RiskQuadrantDetail({ quadrant, color, view }: { quadrant: RiskQuadrant | null; color: string; view: RadarView }): JSX.Element {
  if (!quadrant || quadrant.items.length === 0) {
    return (
      <p className="text-[12.5px] text-gray-400 leading-relaxed py-3">
        Cliquez une zone du radar pour lister {VIEW_NOUN[view]} concernés.
      </p>
    )
  }
  const items = [...quadrant.items].sort((a, b) => (b.exposure ?? -1) - (a.exposure ?? -1))
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-bold text-gray-900 mb-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        {quadrant.name} · {quadrant.items.length}
      </p>
      <ul className="flex flex-col gap-1.5 max-h-[240px] overflow-auto">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-[12.5px] px-2.5 py-1.5 border border-gray-200 rounded-lg bg-page-bg">
            <span className="font-semibold text-gray-900 truncate" title={it.label}>{it.label}</span>
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
              {view === 'sector' && it.sub && <Chip cls="bg-forest-50 text-forest-700">{it.sub}</Chip>}
              {it.exposure !== null && <Chip cls="bg-forest-50 text-forest-700">exp. {it.exposure}</Chip>}
              {it.vital && <Chip cls="bg-gold-50 text-gold-600">vitale</Chip>}
              {it.breach && <Chip cls="bg-red-50 text-red-600">hors seuil</Chip>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Chip({ cls, children }: { cls: string; children: ReactNode }): JSX.Element {
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{children}</span>
}
