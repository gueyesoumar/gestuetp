/**
 * ProductLauncher — vue « Lanceur » du Hub (RFC Hub UX, direction D3).
 * Grille de produits abonnement-aware, entrée directe (1 clic, plus de popover).
 * Posture compacte + accès portefeuille discret. Skin vault sombre.
 */

import type { HubProduct } from '../../lib/hubProducts'

interface PortfolioLink {
  label: string
  count: number
  onOpen: () => void
}

interface ProductLauncherProps {
  products: HubProduct[]
  isEnterable: (p: HubProduct) => boolean
  onOpen: (p: HubProduct) => void
  composite: number | null
  bandLabel: string
  onPosture: () => void
  portfolio: PortfolioLink | null
}

export function ProductLauncher({
  products, isEnterable, onOpen, composite, bandLabel, onPosture, portfolio,
}: ProductLauncherProps): JSX.Element {
  const mine = products.filter(isEnterable)
  const available = products.filter((p) => !isEnterable(p))

  return (
    <div className="flex w-full flex-col items-center gap-8 px-4 py-6">
      {/* posture compacte */}
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-3 rounded-full border border-[rgb(var(--hub-fg)/0.12)] bg-[rgb(var(--hub-fg)/0.04)] px-[18px] py-[9px]">
          <span className="text-[10.5px] font-semibold uppercase tracking-[1.5px] text-[rgb(var(--hub-fg)/0.5)]">Confiance</span>
          <span className="font-mono text-[20px] font-semibold leading-none text-[#D4A843]">{composite ?? '—'}</span>
          <span className="rounded-full bg-[#D4A843] px-2.5 py-[3px] text-[11px] font-semibold text-[#1B4332]">{bandLabel}</span>
          <button type="button" onClick={onPosture} className="ml-0.5 text-[12px] font-semibold text-[#E2C26B] hover:text-[#F0D98A]">détail →</button>
        </div>
        <h2 className="text-[28px] font-light tracking-[-0.4px] text-[rgb(var(--hub-fg))]">Votre écosystème de confiance</h2>
      </div>

      {/* grille produits */}
      <div className="grid w-full max-w-[960px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mine.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onOpen(p)}
            className="flex min-h-[172px] flex-col gap-3 rounded-2xl border border-[rgb(var(--hub-fg)/0.10)] bg-[rgb(var(--hub-fg)/0.045)] p-[22px] text-left transition-colors hover:border-[rgb(var(--hub-fg)/0.25)] hover:bg-[rgb(var(--hub-fg)/0.07)]"
          >
            <span className="h-11 w-11 rounded-[11px]" style={{ background: p.color }} />
            <span className="text-[16px] font-bold text-[rgb(var(--hub-fg))]">{p.name}</span>
            <span className="flex-1 text-[12.5px] text-[rgb(var(--hub-fg)/0.55)]">{p.title}</span>
            <span className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.4px] text-[#7FC79E]">{p.badge}</span>
              <span className="text-[12.5px] font-semibold text-[#E2C26B]">Entrer →</span>
            </span>
          </button>
        ))}
      </div>

      {/* disponibles */}
      {available.length > 0 && (
        <div className="flex w-full max-w-[960px] items-center gap-3.5">
          <span className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[1px] text-[rgb(var(--hub-fg)/0.4)]">Disponibles</span>
          <div className="h-px flex-1 bg-[rgb(var(--hub-fg)/0.1)]" />
          <div className="flex flex-wrap gap-2.5">
            {available.map((p) => (
              <span key={p.name} className="rounded-full border border-dashed border-[rgb(var(--hub-fg)/0.18)] px-3.5 py-1.5 text-[12px] text-[rgb(var(--hub-fg)/0.55)]">{p.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* accès portefeuille */}
      {portfolio && (
        <button type="button" onClick={portfolio.onOpen} className="text-[12.5px] text-[rgb(var(--hub-fg)/0.45)] hover:text-[rgb(var(--hub-fg)/0.7)]">
          Voir votre portefeuille · {portfolio.count} {portfolio.label} →
        </button>
      )}
    </div>
  )
}
