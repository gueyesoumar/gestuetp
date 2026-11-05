import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, PowerOff } from 'lucide-react'
import type { SubsidiaryRow } from './useSubsidiaries'

interface Props {
  subsidiary: SubsidiaryRow
  onEdit?: (s: SubsidiaryRow) => void
  onDeactivate?: (s: SubsidiaryRow) => void
}

/** Menu kebab d'actions d'une carte/ligne d'entité (édition / désactivation),
 * sans déclencher la navigation de la carte cliquable. */
export function SubsidiaryCardMenu({ subsidiary, onEdit, onDeactivate }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent): void => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const stop = (e: React.MouseEvent): void => { e.preventDefault(); e.stopPropagation() }
  const run = (e: React.MouseEvent, fn?: (s: SubsidiaryRow) => void): void => { stop(e); setOpen(false); fn?.(subsidiary) }

  return (
    <div ref={ref} className="relative shrink-0" onClick={stop}>
      <button onClick={(e) => { stop(e); setOpen((o) => !o) }} className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="Actions" aria-haspopup="menu" aria-expanded={open}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-8 z-10 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {onEdit && (
            <button role="menuitem" onClick={(e) => run(e, onEdit)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-gray-700 hover:bg-gray-50">
              <Pencil size={13} /> Modifier
            </button>
          )}
          {onDeactivate && (
            <button role="menuitem" onClick={(e) => run(e, onDeactivate)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-red-600 hover:bg-red-50">
              <PowerOff size={13} /> Désactiver
            </button>
          )}
        </div>
      )}
    </div>
  )
}
