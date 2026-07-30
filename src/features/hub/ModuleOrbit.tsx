import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Shield } from 'lucide-react'
import type { HubProduct } from '../../lib/hubProducts'
import { OrbitModule } from './OrbitModule'

// Dispose les modules uniformement sur un seul anneau (Comply en haut, symetrie
// verticale). Le centre (cadran + sous-titre) est passe en children. Sur petit
// ecran, l'orbite absolue est masquee au profit d'une liste (fallback mobile).

const W = 620
const DISC_R = 210
const LAB_R = 262

interface ModuleOrbitProps {
  products: readonly HubProduct[]
  onSelect: (product: HubProduct, anchor: HTMLElement) => void
  children: ReactNode
}

const pct = (v: number): string => `${(v / W) * 100}%`

export function ModuleOrbit({ products, onSelect, children }: ModuleOrbitProps): JSX.Element {
  const placed = useMemo(
    () =>
      products.map((product, i) => {
        const t = (i * 2 * Math.PI) / products.length
        const sin = Math.sin(t)
        const cos = Math.cos(t)
        return {
          product,
          discPos: { left: pct(W / 2 + DISC_R * sin), top: pct(W / 2 - DISC_R * cos) },
          labPos: { left: pct(W / 2 + LAB_R * sin), top: pct(W / 2 - LAB_R * cos) },
        }
      }),
    [products],
  )

  return (
    <>
      {/* Orbite (desktop) — carré fluide qui remplit la hauteur dispo */}
      <div className="relative mx-auto hidden aspect-square h-full max-h-full max-w-full [container-type:size] md:block">
        <div className="absolute left-1/2 top-1/2 aspect-square w-[67.7cqmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10" />
        <div className="absolute left-1/2 top-1/2 aspect-square w-[87.1cqmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{children}</div>
        {placed.map((p) => (
          <OrbitModule key={p.product.name} product={p.product} discPos={p.discPos} labPos={p.labPos} onSelect={onSelect} />
        ))}
      </div>

      {/* Fallback mobile : centre + liste de modules */}
      <div className="md:hidden">
        <div className="flex justify-center">{children}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {products.map((product) => {
            const soon = !product.active
            return (
              <button
                key={product.name}
                type="button"
                onClick={(e) => onSelect(product, e.currentTarget)}
                aria-label={`${product.name} — ${soon ? product.badge : 'Actif'}`}
                className="w-[104px] rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center"
                style={{ opacity: soon ? 0.5 : 1 }}
              >
                <Shield size={22} strokeWidth={1.6} className="mx-auto" style={{ color: product.color }} />
                <span className="mt-1.5 block text-[12px] font-bold text-white">{product.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
