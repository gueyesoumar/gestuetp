import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/database.types'
import type { HubProduct } from '../../lib/hubProducts'
import { useHubProducts } from './useHubProducts'
import { useEdition } from '../edition/EditionContext'
import { APP_MODULES } from '../edition/moduleRegistry'
import { HubTopBar } from './HubTopBar'
import type { HubView } from './HubTopBar'
import { ProductLauncher } from './ProductLauncher'
import { PoweredByGestu } from '../branding/BrandedAuthHeader'
import { DemoTour } from '../demo/DemoTour'
import { OnboardingProgress } from '../onboarding/OnboardingProgress'

// App-shell du Hub (RFC Hub UX, direction D3 « Lanceur épuré »). Vue unique =
// lanceur (grille produits, entrée directe). Les vues portefeuille ont été
// retirées (plus pertinentes au niveau du Hub).

interface HubCockpitProps {
  profile: User | null
  onSignOut: () => void
  isBranded: boolean
}

export function HubCockpit({ profile, onSignOut, isBranded }: HubCockpitProps): JSX.Element {
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

  const views = useMemo<HubView[]>(() => ['launcher'], [])
  const topBar = (
    <HubTopBar
      views={views} current="launcher" onChange={() => {}} profile={profile} onSignOut={onSignOut}
      showAdmin={Boolean(profile?.is_platform_owner) && !isBranded} isBranded={isBranded}
    />
  )

  if (catalog.loading) {
    return (
      <div className="flex h-full w-full flex-col px-6 py-3">
        {topBar}
        <div className="mx-auto my-auto h-[60%] w-full max-w-[620px] animate-pulse rounded-3xl border border-[rgb(var(--hub-fg)/0.1)] bg-[rgb(var(--hub-fg)/0.03)]" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col px-6 py-3">
      {topBar}
      <OnboardingProgress tone="dark" className="mt-1 shrink-0" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col justify-center py-2">
          <ProductLauncher products={products} isEnterable={isEnterable} onOpen={onOpen} />
        </div>
      </div>
      <PoweredByGestu className="mt-2 shrink-0" />
      <DemoTour />
    </div>
  )
}
