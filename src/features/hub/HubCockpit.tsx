import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/database.types'
import type { HubProduct } from '../../lib/hubProducts'
import { useHubProducts } from './useHubProducts'
import { useEdition } from '../edition/EditionContext'
import { APP_MODULES } from '../edition/moduleRegistry'
import { useHubPerspectives } from './useHubPerspectives'
import type { HubPerspective } from './useHubPerspectives'
import { HubTopBar } from './HubTopBar'
import type { HubView } from './HubTopBar'
import { ProductLauncher } from './ProductLauncher'
import { SegmentedDial } from './SegmentedDial'
import { HubSidePanel } from './HubSidePanel'
import { PoweredByGestu } from '../branding/BrandedAuthHeader'
import { DemoTour } from '../demo/DemoTour'
import { OnboardingProgress } from '../onboarding/OnboardingProgress'

// App-shell du Hub (RFC Hub UX, direction D3 « Lanceur épuré »). Vue par défaut =
// lanceur (grille produits, entrée directe) + vue portefeuille (tuiles par entité).

interface HubCockpitProps {
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

export function HubCockpit({ profile, onSignOut, isBranded }: HubCockpitProps): JSX.Element {
  const data = useHubPerspectives()
  const catalog = useHubProducts()
  const navigate = useNavigate()
  const { hasCapability } = useEdition()

  // Produit primaire + noms d'édition dérivés du REGISTRE de modules (RFC 0013 C1).
  const primaryProduct = APP_MODULES.find((m) => m.enabled(hasCapability))?.product ?? 'Comply'
  const editionProducts = useMemo(() => new Set(APP_MODULES.map((m) => m.product).filter(Boolean) as string[]), [])
  const hasRisk = hasCapability('risk')
  const hasPolicy = hasCapability('policy')
  const hasVendor = hasCapability('vendor')

  const products = useMemo(
    () => catalog.products
      .filter((p) => !editionProducts.has(p.name) || p.name === primaryProduct)
      .map((p) => {
        if (p.name === 'Risk') return { ...p, active: hasRisk, badge: hasRisk ? 'Actif' : p.badge }
        if (p.name === 'Policy') return { ...p, active: hasPolicy, badge: hasPolicy ? 'Actif' : p.badge }
        if (p.name === 'Vendor') return { ...p, active: hasVendor, badge: hasVendor ? 'Actif' : p.badge }
        return p
      }),
    [catalog.products, editionProducts, primaryProduct, hasRisk, hasPolicy, hasVendor],
  )

  const isEnterable = useCallback(
    (p: HubProduct) => p.name === primaryProduct || (p.name === 'Risk' && hasRisk) || (p.name === 'Policy' && hasPolicy) || (p.name === 'Vendor' && hasVendor),
    [primaryProduct, hasRisk, hasPolicy, hasVendor],
  )
  const onOpen = useCallback((p: HubProduct) => {
    if (p.name === primaryProduct) navigate('/')
    else if (p.name === 'Risk') navigate('/risque')
    else if (p.name === 'Policy') navigate('/politiques')
    else if (p.name === 'Vendor') navigate('/fournisseurs')
  }, [navigate, primaryProduct])

  const [view, setView] = useState<HubView>('launcher')
  // La vue « self » (profil de confiance) est retirée : seules les perspectives
  // portefeuille (clients / filiales / assujettis) subsistent.
  const views = useMemo<HubView[]>(() => ['launcher', ...data.perspectives.filter((p) => p !== 'self')], [data.perspectives])

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
        <div className="mx-auto my-auto h-[60%] w-full max-w-[620px] animate-pulse rounded-3xl border border-[rgb(var(--hub-fg)/0.1)] bg-[rgb(var(--hub-fg)/0.03)]" />
      </div>
    )
  }

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
        <OnboardingProgress tone="dark" className="mt-1 shrink-0" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col justify-center py-2">
            <ProductLauncher products={products} isEnterable={isEnterable} onOpen={onOpen} portfolio={portfolio} />
          </div>
        </div>
        <PoweredByGestu className="mt-2 shrink-0" />
        <DemoTour />
      </div>
    )
  }

  const centre = view === 'clients' ? { score: clientsAvg, subtitle: `Portefeuille · ${data.clients.length}` }
    : view === 'group' ? { score: groupAvg, subtitle: `Groupe · ${data.subsidiaries.length}` }
      : { score: assujettisAvg, subtitle: `Parc · ${data.assujettis.length}` }

  const panelTitle = view === 'clients' ? 'Détail par client · plus exposé → plus solide'
    : view === 'group' ? 'Détail par filiale · plus exposé → plus solide'
      : 'Détail par assujetti · plus exposé → plus solide'

  return (
    <div className="flex h-full w-full flex-col px-6 py-3">
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col items-center gap-6 py-4 md:flex-row md:items-center md:justify-center md:gap-12 md:px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-[240px] w-[240px]"><SegmentedDial score={centre.score} /></div>
          <span className="max-w-[280px] text-center text-[12px] text-[rgb(var(--hub-fg)/0.55)]">{centre.subtitle}</span>
        </div>
        <HubSidePanel mode="entities" title={panelTitle}
          tiles={view === 'clients' ? data.clients : view === 'group' ? data.subsidiaries : data.assujettis}
          emptyLabel={view === 'clients' ? 'Aucun client dans votre périmètre.' : view === 'group' ? 'Aucune filiale rattachée.' : 'Aucun assujetti dans votre périmètre.'} />
      </div>
      <PoweredByGestu className="mt-2 shrink-0" />
    </div>
  )
}
