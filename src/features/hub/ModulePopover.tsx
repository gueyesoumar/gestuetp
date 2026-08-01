import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Shield } from 'lucide-react'
import type { HubProduct } from '../../lib/hubProducts'

// Detail d'un module : popover ancre a la position ECRAN du module (position
// fixed) -> toujours visible quelle que soit la fenetre, persistant (CTA
// cliquable). Ferme sur x / clic exterieur / Echap / scroll / resize.

interface ModulePopoverProps {
  product: HubProduct | null
  anchor: HTMLElement | null
  /** Le module ouvre-t-il le workspace interne (produit de l'édition courante) ? */
  enterable?: boolean
  onClose: () => void
  onOpen: (product: HubProduct) => void
}

interface Pos {
  left: number
  top: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(v, hi))

export function ModulePopover({ product, anchor, enterable = false, onClose, onOpen }: ModulePopoverProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Pos | null>(null)

  useLayoutEffect(() => {
    if (!product || !anchor) { setPos(null); return }
    const el = ref.current
    if (!el) return
    const r = anchor.getBoundingClientRect()
    const pw = el.offsetWidth
    const ph = el.offsetHeight
    const m = 12
    const gap = 14
    const vw = window.innerWidth
    const vh = window.innerHeight
    const sx = r.left + r.width / 2
    const left = clamp(sx < vw / 2 ? r.right + gap : r.left - gap - pw, m, vw - pw - m)
    const top = clamp(r.top + r.height / 2 - ph / 2, m, vh - ph - m)
    setPos({ left, top })
  }, [product, anchor])

  useEffect(() => {
    if (!product) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    const onDocClick = (e: MouseEvent): void => {
      const target = e.target as Node // MouseEvent.target est un EventTarget ; on borne au DOM
      if (ref.current && !ref.current.contains(target) && anchor && !anchor.contains(target)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [product, anchor, onClose])

  if (!product) return null
  const soon = !product.active

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={product.name}
      className="fixed z-[60] w-[292px] max-w-[calc(100vw-24px)] rounded-2xl border border-white/15 bg-[#0d2a1e] p-4 shadow-2xl"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? 'visible' : 'hidden' }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg text-[19px] leading-none text-white/40 hover:bg-white/10 hover:text-white"
      >
        &times;
      </button>
      <div className="flex items-center gap-3 pr-6">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-[14px] border"
          style={{ background: `${product.color}16`, borderColor: `${product.color}66` }}
        >
          <Shield size={22} strokeWidth={1.6} style={{ color: product.color }} />
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white">{product.name}</span>
          <span
            className="rounded-full border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em]"
            style={soon
              ? { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.12)' }
              : { color: '#74C69D', borderColor: 'rgba(116,198,157,0.4)', background: 'rgba(64,145,108,0.12)' }}
          >
            {soon ? product.badge : 'Actif'}
          </span>
        </div>
      </div>
      <p className="my-3.5 text-[12.5px] leading-relaxed text-white/60">{product.description}</p>
      {soon ? (
        <div className="rounded-[10px] border border-white/10 py-2.5 text-center text-[13px] font-bold text-white/40">
          Bient&ocirc;t disponible
        </div>
      ) : enterable ? (
        <button
          type="button"
          onClick={() => onOpen(product)}
          className="w-full rounded-[10px] bg-[#D4A843] py-2.5 text-[13px] font-bold text-[#1B4332] transition-colors hover:bg-[#B8922E]"
        >
          Ouvrir &rarr;
        </button>
      ) : (
        <div className="rounded-[10px] border border-white/10 py-2.5 text-center text-[12.5px] font-medium text-white/45">
          Activ&eacute; par votre administrateur
        </div>
      )}
    </div>,
    document.body,
  )
}
