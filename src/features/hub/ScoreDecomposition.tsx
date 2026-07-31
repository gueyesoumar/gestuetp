import { bandColor } from './trustBand'
import { SCORE_DIMENSION_LABELS } from '../../lib/constants'
import { TrustTile } from './TrustTile'
import type { DimScore } from './useSelfDimensionScores'
import type { TrustTileData } from './useHubPerspectives'

// Bande sous l'orbite. Deux états :
//  - self : profil du score en 6 dimensions (axes) + 2 facteurs, valeurs réelles
//    issues des évaluations (n/c si la dimension n'a aucun contrôle évalué) ;
//  - entities : tuiles-score par cible (client / filiale).

interface ScoreDecompositionProps {
  mode: 'self' | 'entities'
  axes?: DimScore[]
  factors?: DimScore[]
  tiles?: TrustTileData[]
  emptyLabel?: string
}

function DimCard({ dim, factor = false }: { dim: DimScore; factor?: boolean }): JSX.Element {
  const measured = dim.score !== null
  const color = measured ? bandColor(dim.score) : 'rgba(255,255,255,0.14)'
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-bold text-white">{SCORE_DIMENSION_LABELS[dim.key]}</span>
        <span
          className="font-mono text-[14px] font-bold tabular-nums"
          style={{ color: measured ? '#fff' : 'rgba(255,255,255,0.35)' }}
        >
          {measured ? dim.score : 'n/c'}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-white/40">
        {factor ? 'Facteur' : `${dim.approved}/${dim.total} contrôles`}
      </div>
      <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${dim.score ?? 0}%`, background: color }} />
      </div>
    </div>
  )
}

export function ScoreDecomposition({ mode, axes = [], factors = [], tiles = [], emptyLabel }: ScoreDecompositionProps): JSX.Element {
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
    <div className="mx-auto max-w-[760px]">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {axes.map((d) => <DimCard key={d.key} dim={d} />)}
      </div>
      {factors.length > 0 && (
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {factors.map((d) => <DimCard key={d.key} dim={d} factor />)}
        </div>
      )}
    </div>
  )
}
