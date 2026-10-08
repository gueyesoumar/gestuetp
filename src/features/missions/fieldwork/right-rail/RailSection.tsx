import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface RailSectionProps {
  id: string
  title: string
  /** Badge optionnel à droite du titre (ex. « 2/4 », « 3 non lus »). */
  badge?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}

/** Section repliable du rail (remplace les onglets). Ouverture pilotée par le parent
 *  pour qu'un signal puisse dérouler la bonne section. `data-section` sert au scroll. */
export function RailSection({ id, title, badge, open, onToggle, children }: RailSectionProps) {
  return (
    <div data-section={id} className="border-t border-gray-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-gray-700 hover:text-forest-700"
      >
        <ChevronRight size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span>{title}</span>
        {badge != null && <span className="ml-auto text-[10px] font-mono text-gray-400">{badge}</span>}
      </button>
      {open && children}
    </div>
  )
}
