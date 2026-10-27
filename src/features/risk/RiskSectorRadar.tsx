import { useMemo, useState } from 'react'
import type { PortfolioOrg } from './useSupervisedPortfolio'
import { buildQuadrants, ZONE_META, type RadarView, type RiskZoneKey } from './riskRadarQuadrants'
import { RiskQuadrantDetail } from './RiskQuadrantDetail'

// Radar en 4 quadrants (zones de risque) : un point par zone (taille = nombre),
// clic = détail. Vues Secteurs / Assujettis / Vitales. Agrège côté client.
const CX = 150, CY = 150, R = 132, GOLD = '#D4A843'
const polar = (a: number, r: number): [number, number] => [CX + r * Math.sin((a * Math.PI) / 180), CY - r * Math.cos((a * Math.PI) / 180)]
const n = (x: number): number => Math.round(x * 10) / 10

const GEO = ZONE_META.map((z) => {
  const [a0, a1] = z.angle
  const [x0, y0] = polar(a0, R), [x1, y1] = polar(a1, R)
  return { key: z.key, name: z.name, color: z.color, path: `M${CX} ${CY} L${n(x0)} ${n(y0)} A${R} ${R} 0 0 1 ${n(x1)} ${n(y1)} Z`, label: polar((a0 + a1) / 2, R - 16), bubble: polar((a0 + a1) / 2, R * 0.52) }
})

const VIEWS: { key: RadarView; label: string }[] = [
  { key: 'sector', label: 'Secteurs' }, { key: 'org', label: 'Assujettis' }, { key: 'vital', label: 'Vitales' },
]
const STORE_KEY = 'risk-radar-view'
const initialView = (): RadarView => {
  try { const v = localStorage.getItem(STORE_KEY); if (v === 'sector' || v === 'org' || v === 'vital') return v } catch { /* ignore */ }
  return 'org'
}

export function RiskSectorRadar({ orgs }: { orgs: PortfolioOrg[] }): JSX.Element {
  const [view, setView] = useState<RadarView>(initialView)
  const [selected, setSelected] = useState<RiskZoneKey | null>(null)
  const quadrants = useMemo(() => buildQuadrants(orgs, view), [orgs, view])
  const total = useMemo(() => quadrants.reduce((s, q) => s + q.items.length, 0), [quadrants])

  if (orgs.length === 0) return <p className="text-[12px] text-gray-400">Aucun assujetti à cartographier.</p>

  const pickView = (v: RadarView): void => {
    setView(v); setSelected(null)
    try { localStorage.setItem(STORE_KEY, v) } catch { /* ignore */ }
  }
  const byKey = (k: RiskZoneKey) => quadrants.find((q) => q.key === k)
  const noun = view === 'vital' ? 'infrastructures vitales' : view === 'sector' ? 'secteurs' : 'assujettis'
  const selQuad = selected ? byKey(selected) ?? null : null
  const selColor = selected ? (ZONE_META.find((z) => z.key === selected)?.color ?? GOLD) : GOLD

  return (
    <div>
      <div className="inline-flex gap-1 rounded-full bg-forest-50 border border-forest-100 p-0.5 mb-3">
        {VIEWS.map((v) => (
          <button key={v.key} type="button" onClick={() => pickView(v.key)}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${view === v.key ? 'bg-forest-700 text-white' : 'text-forest-700 hover:bg-forest-100'}`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <svg viewBox="0 0 300 300" className="w-[300px] max-w-full h-auto shrink-0" role="img" aria-label="Radar des institutions par zone de risque">
          {GEO.map((g) => <path key={g.key} d={g.path} fill={g.color} fillOpacity={0.12} />)}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E5E7EB" />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#E4E5DF" />
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#E4E5DF" />
          {GEO.map((g) => (
            <text key={`l${g.key}`} x={n(g.label[0])} y={n(g.label[1])} textAnchor="middle" fill={g.color} fontSize="10" fontWeight="800" opacity="0.9">{g.name.toUpperCase()}</text>
          ))}
          {GEO.map((g) => {
            const q = byKey(g.key)
            if (!q || q.items.length === 0) return null
            const [bx, by] = g.bubble, rr = 11 + Math.sqrt(q.items.length) * 3.4, on = selected === g.key
            return (
              <g key={`b${g.key}`} role="button" tabIndex={0} aria-label={`${g.name} : ${q.items.length}`} className="cursor-pointer"
                onClick={() => setSelected(on ? null : g.key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(on ? null : g.key) } }}>
                {q.items.some((it) => it.vital) && <circle cx={n(bx)} cy={n(by)} r={n(rr + 3.4)} fill="none" stroke={GOLD} strokeWidth="2" />}
                <circle cx={n(bx)} cy={n(by)} r={n(rr)} fill={g.color} fillOpacity={on ? 1 : 0.9} stroke={on ? '#1A1A1A' : '#fff'} strokeWidth={on ? 2.2 : 1.6} />
                <text x={n(bx)} y={n(by + 4.5)} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">{q.items.length}</text>
              </g>
            )
          })}
        </svg>

        <div className="flex-1 min-w-[200px]">
          <p className="text-[12.5px] font-semibold text-gray-500 mb-2.5">{total} {noun}</p>
          <RiskQuadrantDetail quadrant={selQuad} color={selColor} view={view} />
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-3 text-[11px] text-gray-500">
            {ZONE_META.map((z) => (
              <span key={z.key} className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: z.color, opacity: 0.85 }} />{z.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: GOLD }} />Vitale</span>
          </div>
        </div>
      </div>
    </div>
  )
}
