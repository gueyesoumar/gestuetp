import { ListChecks, Plus } from 'lucide-react'

interface SuggestionChipsProps {
  /** Libellés suggérés (dérivés du référentiel : points à vérifier du contrôle). */
  suggestions: string[]
  /** Appelé au clic sur une chip : crée un constat pré-rempli avec ce libellé. */
  onPick: (label: string) => void
}

/**
 * Chips de suggestion de constats, dérivées de l'existant (controls.audit_checklist).
 * Un clic crée un constat pré-rempli — aucune donnée nouvelle n'est stockée côté chip.
 */
export function SuggestionChips({ suggestions, onPick }: SuggestionChipsProps): JSX.Element | null {
  if (suggestions.length === 0) return null

  return (
    <div className="rounded-lg border border-forest-100 bg-forest-50/60 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-forest-700 inline-flex items-center gap-1.5 mb-2">
        <ListChecks size={11} /> Points à vérifier — cliquez pour créer un constat
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => onPick(label)}
            title={label}
            className="inline-flex items-center gap-1 max-w-full text-[11px] text-forest-800 bg-white border border-forest-200 rounded-full pl-2 pr-2.5 py-1 hover:bg-forest-100 hover:border-forest-300 transition-colors"
          >
            <Plus size={10} className="shrink-0 text-forest-600" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
