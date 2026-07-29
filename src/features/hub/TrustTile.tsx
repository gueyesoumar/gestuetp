import { bandColor, bandLabel } from './trustBand'
import type { TrustTileData } from './useHubPerspectives'

// Tuile-score d'une cible (client ou filiale). Anneau compact en couleur plate.

const R = 22
const CIRC = 2 * Math.PI * R

export function TrustTile({ tile }: { tile: TrustTileData }): JSX.Element {
  const color = bandColor(tile.score)
  const pct = tile.score ?? 0
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 flex items-center gap-4">
      <svg viewBox="0 0 56 56" className="w-[52px] h-[52px] shrink-0" aria-hidden="true">
        <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        {tile.score !== null && (
          <circle
            cx="28" cy="28" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)} transform="rotate(-90 28 28)"
          />
        )}
        <text x="28" y="32" textAnchor="middle" className="fill-white" style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {tile.score === null ? '—' : tile.score}
        </text>
      </svg>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-white truncate">{tile.name}</div>
        <div className="text-[11.5px] font-semibold" style={{ color }}>{bandLabel(tile.score)}</div>
      </div>
    </div>
  )
}
