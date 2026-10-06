import { useState } from 'react'
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
 * Carte verdict de l'écran unique : niveau effectif (choisi, sinon déduit des
 * constats), tag « déduit / ajusté », bouton Modifier révélant le sélecteur.
 */
export function ControlVerdictCard({ conformityLevel, findings, readOnly, onChange }: ControlVerdictCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const derived = deriveSuggestedConformity(findings)
  const chosen = conformityLevel as ConformityLevel | null
  const effective = chosen ?? derived
  const isAdjusted = chosen != null && derived != null && chosen !== derived

  return (
    <div>
      <p className="text-[13px] font-semibold text-gray-700 mb-2">Niveau de conformit&eacute;</p>
      <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-3">
        <span className={`text-sm font-extrabold px-2.5 py-1 rounded-lg ${effective ? LEVEL_BADGE[effective] : 'bg-gray-100 text-gray-400'}`}>
          {effective ? getConformityShort(effective) : '—'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Niveau retenu</p>
          <p className="text-[12px] text-gray-500 truncate">
            {effective ? getConformityLabel(effective) : 'À déterminer'}
            {isAdjusted && derived && <> &middot; ajust&eacute; manuellement (d&eacute;duit&nbsp;: {getConformityShort(derived)})</>}
          </p>
        </div>
        {!readOnly && effective && (
          <span
            className={`inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide px-2 py-1 rounded shrink-0 ${
              isAdjusted ? 'bg-blue-50 text-blue-600' : 'bg-gold-50 text-gold-600'
            }`}
          >
            {isAdjusted ? <><PencilLine size={10} /> Ajust&eacute;</> : <><Sparkles size={10} /> D&eacute;duit</>}
          </span>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="text-[11.5px] font-semibold text-forest-700 hover:text-forest-900 underline underline-offset-2 shrink-0"
          >
            {pickerOpen ? 'Fermer' : 'Modifier'}
          </button>
        )}
      </div>
      {pickerOpen && !readOnly && (
        <div className="mt-2 border border-dashed border-gray-200 rounded-xl p-3">
          <ConformityPicker conformityLevel={conformityLevel} findings={findings} readOnly={readOnly} onChange={(l) => onChange(l)} />
        </div>
      )}
    </div>
  )
}
