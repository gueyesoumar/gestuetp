import type { ReactNode } from 'react'
import { Lightbulb } from 'lucide-react'
import { useDismissedTips } from '../../hooks/useDismissedTips'

/**
 * Coach-mark contextuel (onboarding E5) : une astuce affichée la PREMIÈRE fois
 * qu'un utilisateur atteint un écran clé, refermée définitivement via « Compris »
 * (mémorisé par utilisateur, cross-appareil — voir useDismissedTips).
 *
 * Rendu inline (le parent gère le placement via `className`). Reprend le langage
 * visuel des « points d'attention » (bordure dorée pointillée + ampoule).
 * Ne s'affiche pas tant que l'état n'est pas chargé, ni si déjà fermé.
 */
interface CoachmarkProps {
  tipKey: string
  title: string
  children: ReactNode
  step?: string
  className?: string
}

export function Coachmark({ tipKey, title, children, step, className = '' }: CoachmarkProps): JSX.Element | null {
  const { isDismissed, dismiss, loading } = useDismissedTips()
  if (loading || isDismissed(tipKey)) return null

  return (
    <div className={`rounded-xl border border-dashed border-gold-300 bg-gold-50/50 p-3 flex gap-3 items-start ${className}`}>
      <div className="w-7 h-7 rounded-md bg-gold-100 text-gold-700 flex items-center justify-center shrink-0">
        <Lightbulb size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-gray-900">{title}</p>
        <p className="text-[11.5px] text-gray-600 leading-snug mt-1">{children}</p>
        <div className="flex items-center justify-between mt-2.5">
          <span className="font-mono text-[10px] text-gray-400">{step ?? ''}</span>
          <button
            type="button"
            onClick={() => void dismiss(tipKey)}
            className="text-[11.5px] font-bold text-forest-700 hover:text-forest-900 transition-colors"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  )
}
