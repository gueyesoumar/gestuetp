import { Save, Play } from 'lucide-react'
import { AutosaveIndicator } from '../../../components/ui/AutosaveIndicator'

interface AutosaveState {
  status: 'idle' | 'modified' | 'saving' | 'saved' | 'error'
  lastSavedAt: number | null
  flush: () => Promise<boolean>
}

interface ControlAuthoringFooterProps {
  autoAdvance: boolean
  saving: boolean
  readOnly: boolean
  findingsCount: number
  /** Voies express (Conforme / Non applicable) : autorise la soumission sans constat saisi. */
  allowEmptySubmit?: boolean
  /** Libellé du bouton en mode express (ex. « Soumettre — conforme »). */
  emptySubmitLabel?: string
  autosave: AutosaveState
  onToggleAutoAdvance: () => void
  onSave: () => Promise<void>
  onSubmit: () => Promise<void>
}

export function ControlAuthoringFooter({
  autoAdvance,
  saving,
  readOnly,
  findingsCount,
  allowEmptySubmit = false,
  emptySubmitLabel = 'Soumettre',
  autosave,
  onToggleAutoAdvance,
  onSave,
  onSubmit,
}: ControlAuthoringFooterProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-[#FAFAFA] shrink-0">
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <div onClick={onToggleAutoAdvance} className={`w-8 h-[18px] rounded-full relative cursor-pointer transition-colors ${autoAdvance ? 'bg-forest-500' : 'bg-gray-200'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] shadow-sm transition-all ${autoAdvance ? 'left-[18px]' : 'left-[2px]'}`} />
          </div>
          Auto-avance
        </label>
        {!readOnly && (
          <AutosaveIndicator status={autosave.status} lastSavedAt={autosave.lastSavedAt} onRetry={() => { void autosave.flush() }} />
        )}
      </div>
      <div className="flex gap-2.5 shrink-0">
        {!readOnly && (
          <button onClick={() => void onSave()} disabled={saving} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0">
            <Save size={13} className="inline" /> Enregistrer
          </button>
        )}
        {!readOnly && (
          <button onClick={() => void onSubmit()} disabled={saving || (findingsCount === 0 && !allowEmptySubmit)} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Play size={13} className="shrink-0" /> {allowEmptySubmit ? emptySubmitLabel : 'Soumettre'}
          </button>
        )}
      </div>
    </div>
  )
}
