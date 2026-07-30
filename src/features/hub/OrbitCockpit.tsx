import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HUB_PRODUCTS } from '../../lib/hubProducts'
import type { HubProduct } from '../../lib/hubProducts'
import { useHubPerspectives } from './useHubPerspectives'
import type { HubPerspective } from './useHubPerspectives'
import { PerspectiveToggle } from './PerspectiveToggle'
import { ModuleOrbit } from './ModuleOrbit'
import { SegmentedDial } from './SegmentedDial'
import { ScoreDecomposition } from './ScoreDecomposition'
import { ModulePopover } from './ModulePopover'
import { SCORE_DIMENSIONS } from './scoreDimensions'

// Cockpit orbital du Hub : orbite des modules autour d'un cadran de score
// segmente, bande de decomposition dessous, detail module en popover au clic.
// Perspectives (self / clients / groupe) derivees du graphe via useHubPerspectives.

interface Selection {
  product: HubProduct
  anchor: HTMLElement
}

function average(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

export function OrbitCockpit({ selfScore }: { selfScore: number | null }): JSX.Element {
  const data = useHubPerspectives()
  const navigate = useNavigate()
  const [current, setCurrent] = useState<HubPerspective>('self')
  const [selected, setSelected] = useState<Selection | null>(null)

  useEffect(() => {
    if (data.loading) return
    const preferred: HubPerspective[] = ['clients', 'group', 'self']
    const next = preferred.find((p) => data.perspectives.includes(p)) ?? 'self'
    setCurrent((c) => (data.perspectives.includes(c) ? c : next))
  }, [data.loading, data.perspectives])

  const onSelect = useCallback((product: HubProduct, anchor: HTMLElement) => {
    setSelected((cur) => (cur?.anchor === anchor ? null : { product, anchor }))
  }, [])
  const onClose = useCallback(() => setSelected(null), [])
  const onOpen = useCallback((product: HubProduct) => {
    setSelected(null)
    if (product.href) window.open(product.href, '_blank', 'noopener,noreferrer')
    else if (product.active) navigate('/')
  }, [navigate])

  const dimValues = useMemo(() => SCORE_DIMENSIONS.map((d) => (d.configured ? selfScore : null)), [selfScore])
  const clientsAvg = useMemo(() => average(data.clients.map((t) => t.score)), [data.clients])
  const groupAvg = useMemo(() => average(data.subsidiaries.map((t) => t.score)), [data.subsidiaries])

  if (data.loading) {
    return <div className="mx-auto h-[420px] w-full max-w-[620px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
  }

  const centre =
    current === 'clients'
      ? { score: clientsAvg, segments: undefined, subtitle: `Portefeuille · ${data.clients.length}` }
      : current === 'group'
        ? { score: groupAvg, segments: undefined, subtitle: `Groupe · ${data.subsidiaries.length}` }
        : { score: selfScore, segments: dimValues, subtitle: 'Votre organisation' }

  const eyebrow =
    current === 'clients' ? 'Détail par client · du plus exposé au plus solide'
      : current === 'group' ? 'Détail par filiale · du plus exposé au plus solide'
        : 'Décomposition du score'

  return (
    <div className="w-full max-w-[1040px]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">Poste de confiance</span>
        <PerspectiveToggle perspectives={data.perspectives} value={current} onChange={setCurrent} />
      </div>

      <ModuleOrbit products={HUB_PRODUCTS} onSelect={onSelect}>
        <div className="flex flex-col items-center">
          <SegmentedDial score={centre.score} segments={centre.segments} />
          <span className="mt-2 max-w-[200px] text-center text-[12px] text-white/55">{centre.subtitle}</span>
        </div>
      </ModuleOrbit>

      <p className="mb-3 mt-1 text-center font-mono text-[11px] tracking-[0.04em] text-white/35">
        Cliquez un module pour afficher son d&eacute;tail
      </p>
      <div className="mb-3 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">{eyebrow}</div>

      {current === 'self' ? (
        <ScoreDecomposition mode="self" selfScore={selfScore} />
      ) : (
        <ScoreDecomposition
          mode="entities"
          tiles={current === 'clients' ? data.clients : data.subsidiaries}
          emptyLabel={current === 'clients' ? 'Aucun client dans votre périmètre.' : 'Aucune filiale rattachée.'}
        />
      )}

      <ModulePopover product={selected?.product ?? null} anchor={selected?.anchor ?? null} onClose={onClose} onOpen={onOpen} />
    </div>
  )
}
