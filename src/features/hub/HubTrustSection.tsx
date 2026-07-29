import { useEffect, useState } from 'react'
import { useHubPerspectives } from './useHubPerspectives'
import type { HubPerspective, TrustTileData } from './useHubPerspectives'
import { PerspectiveToggle } from './PerspectiveToggle'
import { TrustCockpit } from './TrustCockpit'
import { TrustTile } from './TrustTile'

// Section « poste de confiance » du Hub : Trust Score au niveau plateforme.
// Perspectives dérivées du graphe ; visible uniquement s'il y a de la matière.

function Tiles({ tiles, empty }: { tiles: TrustTileData[]; empty: string }): JSX.Element {
  if (tiles.length === 0) return <p className="text-[13px] text-white/40">{empty}</p>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tiles.map((t) => <TrustTile key={t.orgId} tile={t} />)}
    </div>
  )
}

export function HubTrustSection({ selfScore }: { selfScore: number | null }): JSX.Element | null {
  const data = useHubPerspectives()
  const [current, setCurrent] = useState<HubPerspective>('self')

  // Défaut : la perspective la plus riche disponible (clients > groupe > self).
  useEffect(() => {
    if (data.loading) return
    const preferred: HubPerspective[] = ['clients', 'group', 'self']
    const next = preferred.find((p) => data.perspectives.includes(p)) ?? 'self'
    setCurrent((c) => (data.perspectives.includes(c) ? c : next))
  }, [data.loading, data.perspectives])

  if (data.loading) {
    return <div className="w-full max-w-[1040px] h-[210px] rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse" />
  }

  return (
    <div className="w-full max-w-[1040px]">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-white/40">Poste de confiance</span>
        <PerspectiveToggle perspectives={data.perspectives} value={current} onChange={setCurrent} />
      </div>

      {current === 'self' && <TrustCockpit score={selfScore} />}
      {current === 'clients' && <Tiles tiles={data.clients} empty="Aucun client dans votre périmètre." />}
      {current === 'group' && <Tiles tiles={data.subsidiaries} empty="Aucune filiale rattachée." />}
    </div>
  )
}
