import { ArrowLeft, ArrowRight, Save, Play } from 'lucide-react'
import { AutosaveIndicator } from '../../../components/ui/AutosaveIndicator'
import { GUIDED_STEPS } from '../mission-constants'

interface AutosaveState {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: number | null
  flush: () => Promise<boolean>
}

interface ControlAuthoringFooterProps {
  mode: 'guided' | 'libre'
  guidedStep: number
  autoAdvance: boolean
  saving: boolean
  readOnly: boolean
  findingsCount: number
  autosave: AutosaveState
  onToggleAutoAdvance: () => void
  onGuidedStepChange: (step: number) => void
  onSave: () => Promise<void>
  onSubmit: () => Promise<void>
}

export function ControlAuthoringFooter({
  mode,
  guidedStep,
  autoAdvance,
  saving,
  readOnly,
  findingsCount,
  autosave,
  onToggleAutoAdvance,
  onGuidedStepChange,
  onSave,
  onSubmit,
}: ControlAuthoringFooterProps) {
  const canGoNext = guidedStep < GUIDED_STEPS.length - 1
  const canGoPrev = guidedStep > 0

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
      <div className="flex gap-2.5">
        {mode === 'guided' && canGoPrev && (
          <button onClick={() => onGuidedStepChange(guidedStep - 1)} className="text-xs text-gray-400 hover:text-gray-600">
            <ArrowLeft size={12} className="inline" /> {GUIDED_STEPS[guidedStep - 1].label}
          </button>
        )}
        {!readOnly && (
          <button onClick={() => void onSave()} disabled={saving} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 disabled:opacity-50 transition-colors">
            <Save size={13} className="inline" /> Enregistrer
          </button>
        )}
        {mode === 'guided' && canGoNext && guidedStep < 3 && (
          <button onClick={() => onGuidedStepChange(guidedStep + 1)} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors">
            {GUIDED_STEPS[guidedStep + 1].label} <ArrowRight size={12} className="inline" />
          </button>
        )}
        {mode === 'libre' && !readOnly && (
          <button onClick={() => void onSubmit()} disabled={saving || findingsCount === 0} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <Play size={13} /> Soumettre
          </button>
        )}
      </div>
    </div>
  )
}
