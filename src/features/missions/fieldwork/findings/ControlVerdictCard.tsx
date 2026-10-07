import { Sparkles, PencilLine } from 'lucide-react'
import { ConformityPicker } from './ConformityPicker'
import { deriveSuggestedConformity, getConformityLabel, getConformityShort } from './conformityRules'
import type { ConformityLevel } from '../../mission-constants'
import type { AssessmentFinding } from '../../../../types/database.types'

const LEVEL_BADGE: Record<ConformityLevel, string> = {
  nc: 'bg-red-50 text-red-600',
  pc: 'bg-amber-50 text-amber-600',
  lc: 'bg-gold-50 text-gold-600',
  c: 'bg-green-50 text-green-600',
  na: 'bg-gray-100 text-gray-400',
}

interface ControlVerdictCardProps {
  conformityLevel: string | null
  findings: AssessmentFinding[]
  readOnly: boolean
  onChange: (level: string) => void
}

/**
 * Carte verdict de l'écran unique : niveau effectif (choisi, sinon déduit), tag
 * « déduit / ajusté », et le sélecteur de niveaux affiché en continu (la voie
 * express est intégrée : « Conforme » ou « N/A » sans constat → soumission directe).
 */
export function ControlVerdictCard({ conformityLevel, findings, readOnly, onChange }: ControlVerdictCardProps) {
  const derived = deriveSuggestedConformity(findings)
  const chosen = conformityLevel as ConformityLevel | null
  const effective = chosen ?? derived
  const isAdjusted = chosen != null && derived != null && chosen !== derived

  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <span className={`text-sm font-extrabold px-2.5 py-1 rounded-lg ${effective ? LEVEL_BADGE[effective] : 'bg-gray-100 text-gray-400'}`}>
          {effective ? getConformityShort(effective) : '—'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Niveau de conformit&eacute;</p>
          <p className="text-[12px] text-gray-600 truncate">
            {effective ? getConformityLabel(effective) : 'À déterminer'}
            {isAdjusted && derived && <> &middot; d&eacute;duit&nbsp;: {getConformityShort(derived)}</>}
          </p>
        </div>
        {effective && (
          <span
            className={`inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide px-2 py-1 rounded shrink-0 ${
              isAdjusted ? 'bg-blue-50 text-blue-600' : 'bg-gold-50 text-gold-600'
            }`}
          >
            {isAdjusted ? <><PencilLine size={10} /> Ajust&eacute;</> : <><Sparkles size={10} /> D&eacute;duit</>}
          </span>
        )}
      </div>

      {!readOnly && (
        <div className="mt-3">
          <ConformityPicker conformityLevel={conformityLevel} findings={findings} readOnly={readOnly} onChange={(l) => onChange(l)} />
          <p className="text-[10.5px] text-gray-400 mt-2">
            &laquo;&nbsp;Conforme&nbsp;&raquo; ou &laquo;&nbsp;Non applicable&nbsp;&raquo; sans constat &rarr; <span className="text-forest-700 font-semibold">soumission directe</span>.
          </p>
        </div>
      )}
    </div>
  )
}
