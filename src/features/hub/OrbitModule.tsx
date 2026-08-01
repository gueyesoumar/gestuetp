import { Shield } from 'lucide-react'
import type { HubProduct } from '../../lib/hubProducts'

// Un satellite de l'orbite : disque (bouton) pose sur l'anneau + libelle place
// radialement vers l'exterieur (jamais vers le centre -> pas de collision).
// La couleur signature du produit est conservee sur le disque (BRAND #7 : c'est
// le lanceur de produit, pas un composant de score partage).

interface Pos {
  left: string
  top: string
}

interface OrbitModuleProps {
  product: HubProduct
  discPos: Pos
  labPos: Pos
  onSelect: (product: HubProduct, anchor: HTMLElement) => void
}

export function OrbitModule({ product, discPos, labPos, onSelect }: OrbitModuleProps): JSX.Element {
  const soon = !product.active
  const status = soon ? product.badge : 'Actif'
  return (
    <>
      <button
        type="button"
        onClick={(e) => onSelect(product, e.currentTarget)}
        aria-label={`${product.name} — ${status}`}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[17px] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]"
        style={{ left: discPos.left, top: discPos.top, opacity: soon ? 0.42 : 1 }}
      >
        <span
          className="flex aspect-square w-[clamp(40px,9.4cqmin,58px)] items-center justify-center rounded-[17px] border"
          style={soon
            ? { background: 'transparent', borderColor: 'rgba(255,255,255,0.10)' }
            : { background: `${product.color}16`, borderColor: `${product.color}66` }}
        >
          <Shield strokeWidth={1.6} className="w-[clamp(17px,4cqmin,24px)] h-[clamp(17px,4cqmin,24px)]" style={{ color: product.color }} />
        </span>
      </button>
      <span
        aria-hidden="true"
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center"
        style={{ left: labPos.left, top: labPos.top, opacity: soon ? 0.42 : 1 }}
      >
        <span className="block text-[clamp(10px,2cqmin,12.5px)] font-bold text-white">{product.name}</span>
        <span className="mt-0.5 block font-mono text-[clamp(7px,1.4cqmin,8.5px)] uppercase tracking-[0.07em] text-white/40">{status}</span>
      </span>
    </>
  )
}
