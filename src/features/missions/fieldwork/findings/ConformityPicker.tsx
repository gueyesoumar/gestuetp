import { Sparkles, AlertTriangle } from 'lucide-react'
import { CONFORMITY_LEVELS } from '../../mission-constants'
import { deriveSuggestedConformity, getConformityShort, getIncoherenceMessage } from './conformityRules'
import type { ConformityLevel } from '../../mission-constants'
import type { AssessmentFinding } from '../../../../types/database.types'

const LEVEL_TEXT_COLORS: Record<string, string> = {
  nc: 'text-red-600',
  pc: 'text-amber-600',
  lc: 'text-gold-600',
  c: 'text-green-600',
  na: 'text-gray-400',
}

interface ConformityPickerProps {
  conformityLevel: string | null
  findings: AssessmentFinding[]
  readOnly: boolean
  onChange: (level: ConformityLevel) => void
}

/**
 * Sélecteur de niveau de conformité : affordance « niveau déduit / Appliquer »,
 * rangée des niveaux, message d'incohérence. Partagé entre la carte verdict
 * (écran unique) et le wizard guidé.
 */
export function ConformityPicker({ conformityLevel, findings, readOnly, onChange }: ConformityPickerProps) {
  const suggested = deriveSuggestedConformity(findings)
  const isApplied = conformityLevel === suggested
  const incoherence = getIncoherenceMessage(conformityLevel as ConformityLevel | null, findings)

  return (
    <div>
      {suggested && !readOnly && (
        <div className="flex items-center gap-1.5 text-[11px] mb-2">
          <Sparkles size={11} className="text-gold-600" />
          <span className="text-gray-500">Sugg&eacute;r&eacute;&nbsp;:</span>
          <span className="font-bold text-forest-700">{getConformityShort(suggested)}</span>
          {!isApplied && (
            <button
              type="button"
              onClick={() => onChange(suggested)}
              className="text-[11px] font-semibold text-forest-700 hover:text-forest-900 underline underline-offset-2"
            >
              Appliquer
            </button>
          )}
        </div>
      )}
      <div className="flex gap-1.5">
        {CONFORMITY_LEVELS.map((level) => {
          const isSelected = conformityLevel === level.key
          const colorCls = LEVEL_TEXT_COLORS[level.key] ?? 'text-gray-500'
          return (
            <button
              key={level.key}
              type="button"
              onClick={() => !readOnly && onChange(level.key)}
              disabled={readOnly}
              title={level.label}
              className={`flex-1 py-1.5 px-1 border rounded-lg text-center transition-all ${
                isSelected ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-200' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50'
              } disabled:cursor-not-allowed`}
            >
              <span className={`text-[12px] font-bold ${colorCls}`}>{level.short}</span>
              <span className="block text-[8.5px] text-gray-500 leading-tight truncate">{level.label}</span>
            </button>
          )
        })}
      </div>
      {incoherence && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-800 leading-relaxed">
            {incoherence} <span className="font-semibold">Une justification &eacute;crite sera demand&eacute;e au moment de la soumission.</span>
          </p>
        </div>
      )}
    </div>
  )
}
