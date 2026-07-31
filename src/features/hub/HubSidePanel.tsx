import { bandColor } from './trustBand'
import { SCORE_DIMENSION_LABELS, SCORE_FACTOR_LABELS } from '../../lib/constants'
import { TrustTile } from './TrustTile'
import type { DimScore, FactorScore } from './useSelfDimensionScores'
import type { TrustTileData } from './useHubPerspectives'

// Panneau latéral droit du cockpit. Self : profil du score en 6 dimensions
// (lignes compactes) + facteurs transverses qui tempèrent le composite
// (pénalité en points affichée). Clients/Groupe : tuiles-score par entité.
// Placé à côté de l'orbite (pas dessous) pour lui laisser toute la hauteur.

function DimRow({ dim }: { dim: DimScore }): JSX.Element {
  const measured = dim.score !== null
  const color = measured ? bandColor(dim.score) : 'rgba(255,255,255,0.14)'
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-t border-white/10 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-semibold text-white">{SCORE_DIMENSION_LABELS[dim.key]}</div>
        <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-white/40">
          {dim.approved}/{dim.total} contr&ocirc;les
        </div>
      </div>
      <div className="font-mono text-[14px] font-bold tabular-nums" style={{ color: measured ? '#fff' : 'rgba(255,255,255,0.35)' }}>
        {measured ? dim.score : 'n/c'}
      </div>
      <div className="col-span-2 mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${dim.score ?? 0}%`, background: color }} />
      </div>
    </div>
  )
}

function FactorRow({ factor }: { factor: FactorScore }): JSX.Element {
  const measured = factor.score !== null
  const color = measured ? bandColor(factor.score) : 'rgba(255,255,255,0.14)'
  const unit = factor.key === 'assurance' ? 'preuves fiables' : 'contrôles'
  const impact = factor.score === null
    ? 'n/c'
    : factor.penaltyPts > 0 ? `−${factor.penaltyPts} pts` : 'neutre'
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-t border-white/10 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-semibold text-white">{SCORE_FACTOR_LABELS[factor.key]}</div>
        <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-white/40">
          {factor.covered}/{factor.total} {unit}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[14px] font-bold tabular-nums" style={{ color: measured ? '#fff' : 'rgba(255,255,255,0.35)' }}>
          {measured ? factor.score : 'n/c'}
        </div>
        <div
          className="font-mono text-[8.5px] uppercase tracking-[0.04em]"
          style={{ color: factor.penaltyPts > 0 ? '#F0A38A' : 'rgba(255,255,255,0.35)' }}
        >
          {impact}
        </div>
      </div>
      <div className="col-span-2 mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${factor.score ?? 0}%`, background: color }} />
      </div>
    </div>
  )
}

interface HubSidePanelProps {
  mode: 'self' | 'entities'
  title: string
  axes?: DimScore[]
  factors?: FactorScore[]
  tiles?: TrustTileData[]
  emptyLabel?: string
}

export function HubSidePanel({ mode, title, axes = [], factors = [], tiles = [], emptyLabel }: HubSidePanelProps): JSX.Element {
  return (
    <aside className="flex min-h-0 w-full flex-col md:w-[340px] md:shrink-0 md:border-l md:border-white/10 md:pl-6">
      <div className="mb-2 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{title}</div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {mode === 'self' ? (
          <>
            {axes.map((d) => <DimRow key={d.key} dim={d} />)}
            {factors.length > 0 && (
              <div className="mt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-white/40">
                Facteurs transverses &middot; temp&egrave;rent le composite
              </div>
            )}
            {factors.map((f) => <FactorRow key={f.key} factor={f} />)}
          </>
        ) : tiles.length === 0 ? (
          <p className="text-[13px] text-white/40">{emptyLabel}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {[...tiles].sort((a, b) => (a.score ?? 999) - (b.score ?? 999)).map((t) => <TrustTile key={t.orgId} tile={t} />)}
          </div>
        )}
      </div>
    </aside>
  )
}
