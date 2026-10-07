interface FindingOptionListProps {
  /** Valeurs prédéfinies proposées (constats-types, risques ou recos liés). */
  options: string[]
  /** Valeur courante (pour l'état sélectionné visuel). */
  value?: string
  onPick: (value: string) => void
}

/**
 * Liste d'options prédéfinies du catalogue lié, en lignes lisibles (adaptées aux
 * phrases longues). Un clic reporte la valeur ; la ligne correspondant à la
 * valeur courante est mise en évidence.
 */
export function FindingOptionList({ options, value, onPick }: FindingOptionListProps): JSX.Element | null {
  if (options.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 mb-2">
      {options.map((opt) => {
        const active = value != null && value.trim() === opt.trim()
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            title={opt}
            className={`relative text-left text-[12px] leading-snug rounded-lg border pl-7 pr-3 py-2 transition-colors ${
              active
                ? 'border-forest-700 bg-forest-50 font-medium text-gray-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-forest-300 hover:bg-forest-50'
            }`}
          >
            <span
              className={`absolute left-2.5 top-[11px] w-3 h-3 rounded-full border ${
                active ? 'border-forest-700 bg-forest-700 shadow-[inset_0_0_0_2px_var(--color-forest-50)]' : 'border-gray-300'
              }`}
            />
            {opt}
          </button>
        )
      })}
    </div>
  )
}
