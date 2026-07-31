import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/database.types'
import { HUB_PRODUCTS } from '../../lib/hubProducts'
import type { HubProduct } from '../../lib/hubProducts'
import { useHubPerspectives } from './useHubPerspectives'
import type { HubPerspective } from './useHubPerspectives'
import { HubTopBar } from './HubTopBar'
import { ModuleOrbit } from './ModuleOrbit'
import { SegmentedDial } from './SegmentedDial'
import { ScoreDecomposition } from './ScoreDecomposition'
import { ModulePopover } from './ModulePopover'
import { PoweredByGestu } from '../branding/BrandedAuthHeader'
import { useSelfDimensionScores } from './useSelfDimensionScores'

// App-shell du Hub : barre du haut (marque + vues + utilisateur), orbite des
// modules en héros central fluide, décomposition en pied. Perspectives dérivées
// du graphe (RFC 0001) via useHubPerspectives.

interface OrbitCockpitProps {
  selfScore: number | null
  profile: User | null
  onSignOut: () => void
  isBranded: boolean
}

interface Selection {
  product: HubProduct
  anchor: HTMLElement
}

function average(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

export function OrbitCockpit({ selfScore, profile, onSignOut, isBranded }: OrbitCockpitProps): JSX.Element {
  const data = useHubPerspectives()
  const selfDims = useSelfDimensionScores()
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

  const axisSegments = useMemo(() => selfDims.axes.map((a) => a.score), [selfDims.axes])
  const clientsAvg = useMemo(() => average(data.clients.map((t) => t.score)), [data.clients])
  const groupAvg = useMemo(() => average(data.subsidiaries.map((t) => t.score)), [data.subsidiaries])

  const topBar = (
    <HubTopBar
      perspectives={data.perspectives}
      current={current}
      onChange={setCurrent}
      profile={profile}
      onSignOut={onSignOut}
      showAdmin={Boolean(profile?.is_platform_owner) && !isBranded}
    />
  )

  if (data.loading) {
    return (
      <div className="flex h-full w-full flex-col px-6 py-3">
        {topBar}
        <div className="mx-auto my-auto h-[60%] w-full max-w-[620px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
      </div>
    )
  }

  const centre =
    current === 'clients'
      ? { score: clientsAvg, segments: undefined, subtitle: `Portefeuille · ${data.clients.length}` }
      : current === 'group'
        ? { score: groupAvg, segments: undefined, subtitle: `Groupe · ${data.subsidiaries.length}` }
        : {
            score: selfDims.composite ?? selfScore,
            segments: axisSegments.length > 0 ? axisSegments : undefined,
            subtitle: `Votre organisation · ${selfDims.measuredAxes}/${selfDims.totalAxes} axes mesurés`,
          }

  const eyebrow =
    current === 'clients' ? 'Détail par client · du plus exposé au plus solide'
      : current === 'group' ? 'Détail par filiale · du plus exposé au plus solide'
        : 'Décomposition du score'

  return (
    <div className="flex h-full w-full flex-col px-6 py-3">
      {topBar}

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
        <ModuleOrbit products={HUB_PRODUCTS} onSelect={onSelect}>
          <div className="flex flex-col items-center">
            <div className="aspect-square w-[34cqmin] max-h-[220px] max-w-[220px]">
              <SegmentedDial score={centre.score} segments={centre.segments} />
            </div>
            <span className="mt-2 max-w-[200px] text-center text-[clamp(10px,1.9cqmin,12px)] text-white/55">{centre.subtitle}</span>
          </div>
        </ModuleOrbit>
      </div>

      <div className="shrink-0">
        <p className="mb-2 text-center font-mono text-[11px] tracking-[0.04em] text-white/35">
          Cliquez un module pour afficher son d&eacute;tail
        </p>
        <div className="mb-2 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">{eyebrow}</div>
        {current === 'self' ? (
          <ScoreDecomposition mode="self" axes={selfDims.axes} factors={selfDims.factors} />
        ) : (
          <ScoreDecomposition
            mode="entities"
            tiles={current === 'clients' ? data.clients : data.subsidiaries}
            emptyLabel={current === 'clients' ? 'Aucun client dans votre périmètre.' : 'Aucune filiale rattachée.'}
          />
        )}
        <PoweredByGestu className="mt-3" />
      </div>

      <ModulePopover product={selected?.product ?? null} anchor={selected?.anchor ?? null} onClose={onClose} onOpen={onOpen} />
    </div>
  )
}
