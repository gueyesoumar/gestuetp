import { RefreshCw } from 'lucide-react'
import type { MissionKind } from '../../types/database.types'

interface MissionKindBadgeProps {
  kind: MissionKind | null | undefined
  /** Variante compacte (icône seule + tooltip) pour les cartes denses comme le Kanban. */
  compact?: boolean
}

/**
 * Affiche un indicateur uniquement pour les missions de supervision continue.
 * Les missions d'audit ponctuel (cas par défaut, le plus fréquent) ne sont pas
 * marquées pour ne pas alourdir l'UI.
 */
export function MissionKindBadge({ kind, compact = false }: MissionKindBadgeProps): JSX.Element | null {
  if (kind !== 'continuous_supervision') return null

  if (compact) {
    return (
      <span
        title="Supervision continue"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      >
        <RefreshCw size={11} strokeWidth={2.4} />
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      <RefreshCw size={10} strokeWidth={2.4} />
      Supervision
    </span>
  )
}
