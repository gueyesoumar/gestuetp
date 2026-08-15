import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/database.types'
import { HUB_PRODUCTS } from '../../lib/hubProducts'
import type { HubProduct } from '../../lib/hubProducts'
import { useEdition } from '../edition/EditionContext'
import { useHubPerspectives } from './useHubPerspectives'
import type { HubPerspective } from './useHubPerspectives'
import { HubTopBar } from './HubTopBar'
import { ModuleOrbit } from './ModuleOrbit'
import { SegmentedDial } from './SegmentedDial'
import { HubSidePanel } from './HubSidePanel'
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
  const { hasCapability } = useEdition()
  // Le produit « primaire » = déduit des capacités de l'org (persona régulateur =
  // capacité supervision). C'est la seule tuile qui ouvre le workspace interne
  // (navigate('/')). Plus de lien externe : un cabinet qui clique « Regul » voit
  // le détail sans quitter son dashboard.
  const primaryProduct = hasCapability('supervision') ? 'Regul' : 'Comply'
  const hasRisk = hasCapability('risk')
  // Risk devient un module actif (ouvrable) dès que l'org a la capacité `risk`.
  const products = useMemo(
    () => HUB_PRODUCTS.map((p) =>
      p.name === 'Risk' ? { ...p, active: hasRisk, badge: hasRisk ? 'Actif' : p.badge } : p,
    ),
    [hasRisk],
  )
  const [current, setCurrent] = useState<HubPerspective>('self')
  const [selected, setSelected] = useState<Selection | null>(null)

  useEffect(() => {
    if (data.loading) return
    const preferred: HubPerspective[] = ['clients', 'group', 'assujettis', 'self']
    const next = preferred.find((p) => data.perspectives.includes(p)) ?? 'self'
    setCurrent((c) => (data.perspectives.includes(c) ? c : next))
  }, [data.loading, data.perspectives])

  const onSelect = useCallback((product: HubProduct, anchor: HTMLElement) => {
    setSelected((cur) => (cur?.anchor === anchor ? null : { product, anchor }))
  }, [])
  const onClose = useCallback(() => setSelected(null), [])
  const onOpen = useCallback((product: HubProduct) => {
    setSelected(null)
    if (product.name === primaryProduct) navigate('/')
    else if (product.name === 'Risk') navigate('/risque')
  }, [navigate, primaryProduct])

  const clientsAvg = useMemo(() => average(data.clients.map((t) => t.score)), [data.clients])
  const groupAvg = useMemo(() => average(data.subsidiaries.map((t) => t.score)), [data.subsidiaries])
  const assujettisAvg = useMemo(() => average(data.assujettis.map((t) => t.score)), [data.assujettis])

  const topBar = (
    <HubTopBar
      perspectives={data.perspectives}
      current={current}
      onChange={setCurrent}
      profile={profile}
      onSignOut={onSignOut}
      showAdmin={Boolean(profile?.is_platform_owner) && !isBranded}
      isBranded={isBranded}
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

  const tempered =
    selfDims.compositePosture !== null &&
    selfDims.composite !== null &&
    selfDims.composite < selfDims.compositePosture
  const selfSubtitle = tempered
    ? `Posture ${selfDims.compositePosture} → réel ${selfDims.composite} · ${selfDims.measuredAxes}/${selfDims.totalAxes} axes`
    : `Votre organisation · ${selfDims.measuredAxes}/${selfDims.totalAxes} axes mesurés`

  const centre =
    current === 'clients'
      ? { score: clientsAvg, subtitle: `Portefeuille · ${data.clients.length}` }
      : current === 'group'
        ? { score: groupAvg, subtitle: `Groupe · ${data.subsidiaries.length}` }
        : current === 'assujettis'
          ? { score: assujettisAvg, subtitle: `Parc · ${data.assujettis.length}` }
          : { score: selfDims.composite ?? selfScore, subtitle: selfSubtitle }

  const panelTitle =
    current === 'clients' ? 'Détail par client · plus exposé → plus solide'
      : current === 'group' ? 'Détail par filiale · plus exposé → plus solide'
        : current === 'assujettis' ? 'Détail par assujetti · plus exposé → plus solide'
          : 'Profil de confiance — 6 dimensions'

  return (
    <div className="flex h-full w-full flex-col px-6 py-3">
      {topBar}

      <div className="flex min-h-0 flex-1 flex-col gap-5 md:flex-row md:gap-6">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <ModuleOrbit products={products} onSelect={onSelect}>
              <div className="flex flex-col items-center">
                <div className="aspect-square w-[34cqmin] max-h-[220px] max-w-[220px]">
                  <SegmentedDial score={centre.score} />
                </div>
                <span className="mt-2 max-w-[200px] text-center text-[clamp(10px,1.9cqmin,12px)] text-white/55">{centre.subtitle}</span>
              </div>
            </ModuleOrbit>
          </div>
          <p className="shrink-0 text-center font-mono text-[11px] tracking-[0.04em] text-white/35">
            Cliquez un module pour afficher son d&eacute;tail
          </p>
        </div>

        {current === 'self' ? (
          <HubSidePanel mode="self" title={panelTitle} axes={selfDims.axes} factors={selfDims.factors} />
        ) : (
          <HubSidePanel
            mode="entities"
            title={panelTitle}
            tiles={current === 'clients' ? data.clients : current === 'group' ? data.subsidiaries : data.assujettis}
            emptyLabel={current === 'clients' ? 'Aucun client dans votre périmètre.' : current === 'group' ? 'Aucune filiale rattachée.' : 'Aucun assujetti dans votre périmètre.'}
          />
        )}
      </div>

      <PoweredByGestu className="mt-2 shrink-0" />
      <ModulePopover product={selected?.product ?? null} anchor={selected?.anchor ?? null} enterable={selected?.product.name === primaryProduct || (selected?.product.name === 'Risk' && hasRisk)} onClose={onClose} onOpen={onOpen} />
    </div>
  )
}
