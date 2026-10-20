import { useMemo } from 'react'
import type { PortfolioOrg } from './useSupervisedPortfolio'

// Radar secteur (Modele A, RFC 0018 Lot B) : angle = secteur, rayon = exposition
// moyenne (bord = eleve), taille de bulle = nombre d'assujettis, anneau or = secteur
// contenant une infrastructure vitale. Les vitales hors seuil restent visibles en
// points rouges. Agrege cote client le portefeuille deja charge (aucune RPC dediee).

const R = 104
const bandColor = (e: number): string => (e >= 60 ? '#C0392B' : e >= 30 ? '#B8860B' : '#27AE60')
const pos = (angleDeg: number, radius: number): [number, number] => {
  const a = (angleDeg * Math.PI) / 180
  return [120 + radius * Math.sin(a), 120 - radius * Math.cos(a)]
}

interface SectorAgg { sector: string; count: number; avg: number; hasVital: boolean; angle: number }

export function RiskSectorRadar({ orgs }: { orgs: PortfolioOrg[] }): JSX.Element {
  const { sectors, crit } = useMemo(() => {
    const map = new Map<string, PortfolioOrg[]>()
    orgs.forEach((o) => {
      const k = o.sector ?? 'Autre'
      map.set(k, [...(map.get(k) ?? []), o])
    })
    const keys = [...map.keys()].sort()
    const secs: SectorAgg[] = keys.map((sector, i) => {
      const list = map.get(sector) ?? []
      const avg = Math.round(list.reduce((s, o) => s + o.avg_exposure, 0) / list.length)
      return { sector, count: list.length, avg, hasVital: list.some((o) => o.is_iic), angle: (i / keys.length) * 360 }
    })
    const critPts = orgs
      .filter((o) => o.is_iic && o.above_threshold > 0)
      .map((o) => ({ angle: (keys.indexOf(o.sector ?? 'Autre') / keys.length) * 360, e: o.max_exposure }))
    return { sectors: secs, crit: critPts }
  }, [orgs])

  if (orgs.length === 0) return <p className="text-[12px] text-gray-400">Aucun assujetti a cartographier.</p>

  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <svg viewBox="0 0 240 240" className="w-[250px] max-w-full" role="img" aria-label="Radar des assujettis par secteur et exposition">
        <circle cx="120" cy="120" r={R} fill="#fff" stroke="#D5D7CF" />
        {[78, 52, 26].map((r) => <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="#E4E5DF" />)}
        <line x1="120" y1="16" x2="120" y2="224" stroke="#E4E5DF" />
        <line x1="16" y1="120" x2="224" y2="120" stroke="#E4E5DF" />
        {sectors.map((s) => {
          const [lx, ly] = pos(s.angle, 114)
          const anchor = Math.sin((s.angle * Math.PI) / 180) > 0.35 ? 'end' : Math.sin((s.angle * Math.PI) / 180) < -0.35 ? 'start' : 'middle'
          return <text key={`l${s.sector}`} x={lx} y={ly + 2} fill="#9CA3AF" fontSize="7" textAnchor={anchor}>{s.sector}</text>
        })}
        {sectors.map((s) => {
          const [cx, cy] = pos(s.angle, (s.avg / 100) * R)
          const rad = 6 + Math.sqrt(s.count) * 1.7
          return (
            <g key={s.sector}>
              {s.hasVital && <circle cx={cx} cy={cy} r={rad + 2.6} fill="none" stroke="#D4A843" strokeWidth="1.4" />}
              <circle cx={cx} cy={cy} r={rad} fill={bandColor(s.avg)} fillOpacity="0.82" stroke="#fff" />
              <text x={cx} y={cy + 3.3} fill="#fff" fontSize="9.5" fontWeight="700" textAnchor="middle">{s.count}</text>
            </g>
          )
        })}
        {crit.map((c, i) => {
          const [cx, cy] = pos(c.angle + (i % 2 ? 15 : -15), (c.e / 100) * R)
          return <circle key={`c${i}`} cx={cx} cy={cy} r="3.4" fill="#C0392B" stroke="#fff" />
        })}
        <circle cx="120" cy="120" r="2.4" fill="#9CA3AF" />
      </svg>
      <div className="text-[11.5px] text-gray-600 space-y-2 min-w-[150px]">
        <div className="font-semibold text-gray-900">{orgs.length} assujettis · {sectors.length} secteurs</div>
        <Leg color="#C0392B" label="Exposition élevée" />
        <Leg color="#B8860B" label="moyenne" />
        <Leg color="#27AE60" label="faible" />
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full border-2 border-[#D4A843]" /> Infrastructure vitale</div>
        <div className="text-[10.5px] text-gray-400">Bulle = secteur (taille = nombre). Points rouges = vitales hors seuil.</div>
      </div>
    </div>
  )
}

function Leg({ color, label }: { color: string; label: string }): JSX.Element {
  return <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} /> {label}</div>
}
