import { bandColor } from './trustBand'
import { SCORE_DIMENSIONS } from './scoreDimensions'
import { TrustTile } from './TrustTile'
import type { TrustTileData } from './useHubPerspectives'

// Bande sous l'orbite. Deux etats :
//  - self : decomposition du score en 4 dimensions (n/c si module non active) ;
//  - entities : tuiles-score par cible (client / filiale), triees plus expose -> plus solide.

interface ScoreDecompositionProps {
  mode: 'self' | 'entities'
  selfScore?: number | null
  tiles?: TrustTileData[]
  emptyLabel?: string
}

export function ScoreDecomposition({ mode, selfScore = null, tiles = [], emptyLabel }: ScoreDecompositionProps): JSX.Element {
  if (mode === 'entities') {
    if (tiles.length === 0) return <p className="text-center text-[13px] text-white/40">{emptyLabel}</p>
    const sorted = [...tiles].sort((a, b) => (a.score ?? 999) - (b.score ?? 999))
    return (
      <div className="mx-auto grid max-w-[720px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t) => <TrustTile key={t.orgId} tile={t} />)}
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-[720px] grid-cols-2 gap-2.5 sm:grid-cols-4">
      {SCORE_DIMENSIONS.map((d) => {
        const value = d.configured ? selfScore : null
        const color = value === null ? 'rgba(255,255,255,0.14)' : bandColor(value)
        return (
          <div key={d.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-bold text-white">{d.label}</span>
              <span
                className="font-mono text-[14px] font-bold tabular-nums"
                style={{ color: value === null ? 'rgba(255,255,255,0.35)' : '#fff' }}
              >
                {value === null ? 'n/c' : value}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-white/40">
              {d.configured ? d.module : `${d.module} · non activé`}
            </div>
            <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
