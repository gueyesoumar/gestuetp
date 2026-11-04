/**
 * ProductLauncher - vue « Lanceur » du Hub (RFC Hub UX, direction D3).
 * Grille de produits abonnement-aware, entrée directe (1 clic). Recherche dans le hero.
 * Skin vault sombre, contraste AA.
 */

import { Landmark, ShieldCheck, AlertTriangle, FileText, Users, LayoutGrid } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HubProduct } from '../../lib/hubProducts'
import { HubSearch } from './HubSearch'

interface ProductLauncherProps {
  products: HubProduct[]
  isEnterable: (p: HubProduct) => boolean
  onOpen: (p: HubProduct) => void
}

// Glyphe distinct par module (repli générique si le nom produit est inconnu).
const ICONS: Record<string, LucideIcon> = {
  Regul: Landmark, Comply: ShieldCheck, Risk: AlertTriangle, Policy: FileText, Vendor: Users,
}

/** Encre claire ou sombre selon la luminance de l'accent, pour rester lisible dessus. */
function inkOn(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#15271E'
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#15271E' : '#FFFFFF'
}

export function ProductLauncher({ products, isEnterable, onOpen }: ProductLauncherProps): JSX.Element {
  const mine = products.filter(isEnterable)
  const available = products.filter((p) => !isEnterable(p))
  const plural = mine.length > 1 ? 's' : ''

  return (
    <div className="flex w-full flex-col items-center gap-8 px-4 py-6">
      <div className="flex w-full max-w-[960px] flex-col items-center gap-3">
        <h2 className="text-[28px] font-light tracking-[-0.4px] text-[rgb(var(--hub-fg))]">Votre écosystème Gëstu</h2>
        <p className="text-[13.5px] text-[rgb(var(--hub-fg)/0.7)]">
          {mine.length} module{plural} actif{plural}. Choisissez un espace pour commencer.
        </p>
        <HubSearch products={products} isEnterable={isEnterable} onOpen={onOpen} />
      </div>

      {/* grille produits */}
      <div className="grid w-full max-w-[960px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mine.map((p) => {
          const Icon = ICONS[p.name] ?? LayoutGrid
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => onOpen(p)}
              className="flex min-h-[172px] flex-col gap-3 rounded-2xl border border-[rgb(var(--hub-fg)/0.16)] bg-[rgb(var(--hub-fg)/0.05)] p-[22px] text-left transition-colors hover:border-[rgb(var(--hub-fg)/0.3)] hover:bg-[rgb(var(--hub-fg)/0.08)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-[11px]" style={{ background: p.color, color: inkOn(p.color) }}>
                <Icon size={24} strokeWidth={2} />
              </span>
              <span className="text-[16px] font-bold text-[rgb(var(--hub-fg))]">{p.name}</span>
              <span className="flex-1 text-[12.5px] text-[rgb(var(--hub-fg)/0.7)]">{p.title}</span>
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.4px] text-[#7FC79E]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4FAE80]" />{p.badge}
                </span>
                <span className="text-[12.5px] font-semibold text-[#E2C26B]">Entrer →</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* disponibles */}
      {available.length > 0 && (
        <div className="flex w-full max-w-[960px] flex-col gap-2.5">
          <div className="flex items-center gap-3.5">
            <span className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[1px] text-[rgb(var(--hub-fg)/0.55)]">Disponibles</span>
            <div className="h-px flex-1 bg-[rgb(var(--hub-fg)/0.12)]" />
          </div>
          <p className="text-[12px] text-[rgb(var(--hub-fg)/0.6)]">Modules non activés sur votre instance. Activation par un administrateur.</p>
          <div className="flex flex-wrap gap-2.5">
            {available.map((p) => (
              <span key={p.name} className="rounded-full border border-dashed border-[rgb(var(--hub-fg)/0.28)] px-3.5 py-1.5 text-[12px] text-[rgb(var(--hub-fg)/0.7)]">{p.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
