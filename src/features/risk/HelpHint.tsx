import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { Info } from 'lucide-react'

interface Props {
  title: string
  children: ReactNode
  /** Contenu de bas de bulle (ex. un lien « Voir la méthode »). */
  footer?: ReactNode
}

const W = 288

/** Pastille d'aide ⓘ générique : popover en position fixe (échappe aux overflow),
 *  recadré dans la fenêtre, se ferme au clic extérieur / défilement / resize. */
export function HelpHint({ title, children, footer }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - W - 8)) })
  }, [])

  useEffect(() => {
    if (!open) return
    place()
    function onDoc(e: MouseEvent): void {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    function onClose(): void { setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [open, place])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 align-middle"
        title={title}
        aria-label={title}
      >
        <Info size={14} />
      </button>
      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: W, zIndex: 50 }}
          className="rounded-xl border border-gray-200 bg-white p-3 text-left normal-case font-normal tracking-normal shadow-xl"
        >
          <p className="text-[12px] font-bold text-gray-900 mb-1.5">{title}</p>
          <div className="text-[12px] text-gray-600">{children}</div>
          {footer && <div className="mt-2">{footer}</div>}
        </div>
      )}
    </>
  )
}
