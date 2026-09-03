import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/database.types'
import type { HubProduct } from '../../lib/hubProducts'
import { useHubProducts } from './useHubProducts'
import { useEdition } from '../edition/EditionContext'
import { useHubPerspectives } from './useHubPerspectives'
import type { HubPerspective } from './useHubPerspectives'
import { HubTopBar } from './HubTopBar'
import type { HubView } from './HubTopBar'
import { ProductLauncher } from './ProductLauncher'
import { SegmentedDial } from './SegmentedDial'
import { HubSidePanel } from './HubSidePanel'
import { PoweredByGestu } from '../branding/BrandedAuthHeader'
import { useSelfDimensionScores } from './useSelfDimensionScores'
import { bandLabel } from './trustBand'

// App-shell du Hub (RFC Hub UX, direction D3 « Lanceur épuré »). Vue par défaut =
// lanceur (grille produits, entrée directe). Deux vues secondaires réutilisées :
// « Ma posture » (self : cadran + 6 axes) et le portefeuille (tuiles par entité).

interface HubCockpitProps {
  selfScore: number | null
  profile: User | null
  onSignOut: () => void
  isBranded: boolean
}

function average(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

const ENTITY_LABEL: Record<HubPerspective, string> = { self: '', clients: 'clients', group: 'filiales', assujettis: 'assujettis' }

export function HubCockpit({ selfScore, profile, onSignOut, isBranded }: HubCockpitProps): JSX.Element {
  const data = useHubPerspectives()
  const catalog = useHubProducts()
  const selfDims = useSelfDimensionScores()
  const navigate = useNavigate()
  const { hasCapability } = useEdition()

  const primaryProduct = hasCapability('supervision') ? 'Regul' : 'Comply'
  const hasRisk = hasCapability('risk')
  const hasPolicy = hasCapability('policy')

  const products = useMemo(
    () => catalog.products.map((p) => {
      if (p.name === 'Risk') return { ...p, active: hasRisk, badge: hasRisk ? 'Actif' : p.badge }
      if (p.name === 'Policy') return { ...p, active: hasPolicy, badge: hasPolicy ? 'Actif' : p.badge }
      return p
    }),
    [catalog.products, hasRisk, hasPolicy],
  )

  const isEnterable = useCallback(
    (p: HubProduct) => p.name === primaryProduct || (p.name === 'Risk' && hasRisk) || (p.name === 'Policy' && hasPolicy),
    [primaryProduct, hasRisk, hasPolicy],
  )
  const onOpen = useCallback((p: HubProduct) => {
    if (p.name === primaryProduct) navigate('/')
    else if (p.name === 'Risk') navigate('/risque')
    else if (p.name === 'Policy') navigate('/politiques')
  }, [navigate, primaryProduct])

  const [view, setView] = useState<HubView>('launcher')
  const views = useMemo<HubView[]>(() => ['launcher', ...data.perspectives], [data.perspectives])

  const clientsAvg = useMemo(() => average(data.clients.map((t) => t.score)), [data.clients])
  const groupAvg = useMemo(() => average(data.subsidiaries.map((t) => t.score)), [data.subsidiaries])
  const assujettisAvg = useMemo(() => average(data.assujettis.map((t) => t.score)), [data.assujettis])

  const topBar = (
    <HubTopBar
      views={views} current={view} onChange={setView} profile={profile} onSignOut={onSignOut}
      showAdmin={Boolean(profile?.is_platform_owner) && !isBranded} isBranded={isBranded}
    />
  )

  if (data.loading || catalog.loading) {
    return (
      <div className="flex h-full w-full flex-col px-6 py-3">
        {topBar}
        <div className="mx-auto my-auto h-[60%] w-full max-w-[620px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
      </div>
    )
  }

  const composite = selfDims.composite ?? selfScore
  const entityPersp = data.perspectives.find((p) => p !== 'self') ?? null
  const portfolio = entityPersp
    ? {
        label: ENTITY_LABEL[entityPersp],
        count: entityPersp === 'clients' ? data.clients.length : entityPersp === 'group' ? data.subsidiaries.length : data.assujettis.length,
        onOpen: () => setView(entityPersp),
      }
    : null

  if (view === 'launcher') {
    return (
      <div className="flex h-full w-full flex-col px-6 py-3">
        {topBar}
        <ProductLauncher
          products={products} isEnterable={isEnterable} onOpen={onOpen}
          composite={composite} bandLabel={bandLabel(composite)} onPosture={() => setView('self')} portfolio={portfolio}
        />
        <PoweredByGestu className="mt-2 shrink-0" />
      </div>
    )
  }

  const tempered = selfDims.compositePosture !== null && selfDims.composite !== null && selfDims.composite < selfDims.compositePosture
  const selfSubtitle = tempered
    ? `Posture ${selfDims.compositePosture} → réel ${selfDims.composite} · ${selfDims.measuredAxes}/${selfDims.totalAxes} axes`
    : `Votre organisation · ${selfDims.measuredAxes}/${selfDims.totalAxes} axes mesurés`

  const centre = view === 'clients' ? { score: clientsAvg, subtitle: `Portefeuille · ${data.clients.length}` }
    : view === 'group' ? { score: groupAvg, subtitle: `Groupe · ${data.subsidiaries.length}` }
      : view === 'assujettis' ? { score: assujettisAvg, subtitle: `Parc · ${data.assujettis.length}` }
        : { score: composite, subtitle: selfSubtitle }

  const panelTitle = view === 'clients' ? 'Détail par client · plus exposé → plus solide'
    : view === 'group' ? 'Détail par filiale · plus exposé → plus solide'
      : view === 'assujettis' ? 'Détail par assujetti · plus exposé → plus solide'
        : 'Profil de confiance — 6 dimensions'

  return (
    <div className="flex h-full w-full flex-col px-6 py-3">
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col items-center gap-6 py-4 md:flex-row md:items-center md:justify-center md:gap-12 md:px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-[240px] w-[240px]"><SegmentedDial score={centre.score} /></div>
          <span className="max-w-[280px] text-center text-[12px] text-white/55">{centre.subtitle}</span>
        </div>
        {view === 'self'
          ? <HubSidePanel mode="self" title={panelTitle} axes={selfDims.axes} factors={selfDims.factors} />
          : <HubSidePanel mode="entities" title={panelTitle}
              tiles={view === 'clients' ? data.clients : view === 'group' ? data.subsidiaries : data.assujettis}
              emptyLabel={view === 'clients' ? 'Aucun client dans votre périmètre.' : view === 'group' ? 'Aucune filiale rattachée.' : 'Aucun assujetti dans votre périmètre.'} />}
      </div>
      <PoweredByGestu className="mt-2 shrink-0" />
    </div>
  )
}
