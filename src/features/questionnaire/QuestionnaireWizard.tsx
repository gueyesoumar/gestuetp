import { useState } from 'react'
import { Check } from 'lucide-react'
import { WizardProgress } from './WizardProgress'
import { WizardCompletedSummary } from './WizardCompletedSummary'
import { WizardQuestionCard } from './WizardQuestionCard'
import { useWizardState } from './useWizardState'
import type { Question } from '../../types/database.types'

interface QuestionnaireWizardProps {
  questions: Question[]
  instanceId: string | null
  userId: string | null
  missionName?: string
  initialResponses?: Map<string, unknown>
  readOnly?: boolean
  onComplete?: () => void
}

export function QuestionnaireWizard({ questions, instanceId, userId, missionName, initialResponses, readOnly, onComplete }: QuestionnaireWizardProps) {
  const state = useWizardState(questions, instanceId, userId, initialResponses)
  const [completed, setCompleted] = useState(false)

  if (questions.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-12">Aucune question dans ce questionnaire.</p>
  }

  const handleComplete = () => {
    setCompleted(true)
    onComplete?.()
  }

  // === Ecran de fin ===
  if (completed) {
    const answeredCount = questions.filter((q) => state.responses.has(q.code)).length
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="py-16 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-5"><Check size={32} /></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Questionnaire termin&eacute; !</h2>
          <p className="text-[13px] text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
            Merci d&apos;avoir compl&eacute;t&eacute; le questionnaire. Vos {answeredCount} r&eacute;ponses ont &eacute;t&eacute; sauvegard&eacute;es automatiquement.
            L&apos;&eacute;quipe d&apos;audit les analysera pour pr&eacute;parer la mission.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setCompleted(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:border-forest-300 transition-colors">
              &larr; Revoir mes r&eacute;ponses
            </button>
            <a href="/missions"
              className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors inline-block">
              Retour aux missions
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-extrabold text-forest-900">G&euml;stu<span className="text-gold-500">.</span></span>
          {missionName && <span className="text-[11px] text-gray-300">{missionName}</span>}
        </div>
        {state.saving ? (
          <span className="text-[11px] text-gray-300">Sauvegarde...</span>
        ) : (
          <span className="text-[11px] text-green-600 flex items-center gap-1"><Check size={11} /> Sauvegarde auto</span>
        )}
      </div>

      {/* Progress */}
      <WizardProgress
        currentStep={state.currentIndex + 1}
        totalSteps={questions.length}
        sections={state.sections}
        currentSection={state.currentSection}
      />

      {/* Completed summary */}
      <WizardCompletedSummary
        questions={questions}
        responses={state.responses}
        currentIndex={state.currentIndex}
        onGoTo={state.goTo}
      />

      {/* Current question */}
      {state.currentQuestion && (
        <WizardQuestionCard
          question={state.currentQuestion}
          sectionLabel={state.sectionLabel}
          value={state.responses.get(state.currentQuestion.code) ?? null}
          onChange={(v) => state.setResponse(state.currentQuestion!.code, v)}
          readOnly={readOnly}
        />
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-[#FAFAFA]">
        <button onClick={state.goPrev} disabled={!state.canGoPrev}
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-500 bg-white hover:border-forest-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          &larr; Pr&eacute;c&eacute;dent
        </button>

        {!state.currentQuestion?.is_required && !state.isLast && (
          <button onClick={state.goNext} className="text-xs text-gray-300 hover:text-gray-500">Passer</button>
        )}

        {state.isLast ? (
          <button onClick={handleComplete}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-[13px] font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
            <Check size={14} /> Terminer le questionnaire
          </button>
        ) : (
          <button onClick={state.goNext} disabled={!state.canGoNext}
            className="px-6 py-2.5 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
            Suivant &rarr;
          </button>
        )}
      </div>
    </div>
  )
}
