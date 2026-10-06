interface TemplateChipsProps {
  /** Valeurs prédéfinies proposées (constats-types, risques ou recos liés). */
  options: string[]
  /** Valeur courante (pour l'état sélectionné visuel). */
  value?: string
  onPick: (value: string) => void
}

/**
 * Rangée de pastilles de valeurs prédéfinies (catalogue lié). Un clic reporte la valeur
 * dans le champ ; la pastille correspondant à la valeur courante est mise en évidence.
 */
export function TemplateChips({ options, value, onPick }: TemplateChipsProps): JSX.Element | null {
  if (options.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mb-1.5">
      {options.map((opt) => {
        const active = value != null && value.trim() === opt.trim()
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            title={opt}
            className={`inline-flex items-center max-w-full text-[11px] rounded-full px-2.5 py-1 border transition-colors ${
              active
                ? 'bg-forest-700 text-white border-transparent'
                : 'bg-white text-forest-800 border-forest-200 hover:bg-forest-50 hover:border-forest-300'
            }`}
          >
            <span className="truncate">{opt}</span>
          </button>
        )
      })}
    </div>
  )
}
