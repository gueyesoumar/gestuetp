import { useOrgSubscription } from './useOrgSubscription'
import { useCurrencyDisplay } from './useCurrencyDisplay'
import { SubscriptionProductCard } from './SubscriptionProductCard'
import { SubscriptionMrrPanel } from './SubscriptionMrrPanel'
import { SubscriptionPlans } from './SubscriptionPlans'
import { CURRENCIES, CURRENCY_LABEL } from '../../../lib/money'

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="px-4 py-3 border-l border-gray-200 first:border-l-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{label}</div>
      <div className="text-[15px] font-bold text-gray-900 mt-1">{value}</div>
    </div>
  )
}

export function CabinetSubscriptionTab({ cabinetId }: { cabinetId: string }): JSX.Element {
  const { state, catalog, platformMrr, loading, busy, act } = useOrgSubscription(cabinetId)
  const { currency, setCurrency, format } = useCurrencyDisplay()

  if (loading || !state || !catalog) {
    return <div className="mt-5 h-40 rounded-xl border border-gray-200 bg-white animate-pulse" />
  }

  const subByProduct = new Map(state.subscriptions.map((s) => [s.product_key, s]))
  const counts = state.subscriptions.reduce(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )
  const planSlugs = [...new Set(state.subscriptions.map((s) => s.plan_slug).filter(Boolean))]
  const currentPlan = planSlugs.length === 1 ? (planSlugs[0] as string) : null
  const homeName = state.home_product ? (catalog.products.find((p) => p.key === state.home_product)?.name ?? state.home_product) : '—'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-gray-500">Montants en <b className="text-gray-700">FCFA</b> — affichage&nbsp;:</span>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 text-[12px] font-semibold ${currency === c ? 'bg-forest-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {CURRENCY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <Stat label="Accueil" value={homeName} />
        <Stat label="Plan" value={currentPlan ? (catalog.plans.find((p) => p.slug === currentPlan)?.name ?? currentPlan) : 'À la carte'} />
        <Stat label="Remise" value={`${state.discount_pct ?? 0} %`} />
        <Stat label="MRR net" value={format(state.mrr)} />
        <Stat label="Statuts" value={`${counts.active ?? 0} A · ${counts.trial ?? 0} E · ${counts.suspended ?? 0} S`} />
      </div>

      <section>
        <h2 className="text-[14px] font-bold text-gray-900 mb-1">Plans</h2>
        <p className="text-[12px] text-gray-500 mb-3">Applique en un clic les produits et fonctionnalités du bundle (statut actif).</p>
        <SubscriptionPlans plans={catalog.plans} products={catalog.products} currentPlan={currentPlan} busy={busy} onAct={act} />
      </section>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <section className="lg:col-span-2">
          <h2 className="text-[14px] font-bold text-gray-900 mb-1">Produits et fonctionnalités</h2>
          <p className="text-[12px] text-gray-500 mb-3">Souscrire · essai · suspendre. Prend effet sur l&rsquo;accès à l&rsquo;activation du modèle abonnement (C+P3).</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {catalog.products.map((product) => (
              <SubscriptionProductCard
                key={product.key}
                product={product}
                features={catalog.features.filter((f) => f.product_key === product.key)}
                entry={subByProduct.get(product.key)}
                isHome={state.home_product === product.key}
                busy={busy}
                onAct={act}
                format={format}
              />
            ))}
          </div>
        </section>
        <SubscriptionMrrPanel mrr={state.mrr} discountPct={state.discount_pct ?? 0} platformMrr={platformMrr} busy={busy} onAct={act} format={format} />
      </div>

      <p className="text-[11.5px] text-gray-400">Historique des actes : voir l&rsquo;onglet <b className="text-gray-500">Audit log</b> (actions <code className="font-mono">subscription.*</code>).</p>
    </div>
  )
}
