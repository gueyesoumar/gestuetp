import { Check } from 'lucide-react'
import { GUIDED_STEPS } from '../mission-constants'
import { ObserverStep } from './steps/ObserverStep'
import { DocumenterStep } from './steps/DocumenterStep'
import { AnalyserStep } from './steps/AnalyserStep'
import { ValidationStep } from './steps/ValidationStep'

const STEP_SUBTITLES: Record<string, string> = {
  observer: 'Décrire ce qui a été constaté',
  documenter: 'Rattacher les preuves',
  analyser: 'Conformité, constats, recos',
  validation: 'Récap & soumission',
}
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { Document, AuditChecklistItem } from '../../../types/database.types'
import type { ConformityLevel } from '../mission-constants'
import type { UseAssessmentFindingsReturn } from './findings/useAssessmentFindings'
import type { CadrageAnswer } from './right-rail/useControlContext'

interface GuidedWorkflowProps {
  assessment: AssessmentWithControl
  currentStep: number
  onStepChange?: (step: number) => void
  observations: string
  evidenceNotes: string
  documents: Document[]
  uploading: boolean
  uploadError: string | null
  onUpload: (file: File, description: string) => Promise<boolean>
  onDeleteDoc: (docId: string, filePath: string) => Promise<boolean>
  onObservationsChange: (v: string) => void
  onEvidenceNotesChange: (v: string) => void
  conformityLevel: string | null
  onConformityChange: (v: string) => void
  findingsHook: UseAssessmentFindingsReturn
  auditChecklist: AuditChecklistItem[]
  cadrageAnswers: CadrageAnswer[]
  clientName?: string | null
  onSubmit: () => void
  saving: boolean
  readOnly: boolean
}

export function GuidedWorkflow(props: GuidedWorkflowProps){
  const { assessment, currentStep, onStepChange, saving, readOnly, findingsHook } = props

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-2 p-3 bg-[#FAFAF8] border border-gray-200 rounded-xl">
          {GUIDED_STEPS.map((step, i) => {
            const isDone = i < currentStep
            const isCurrent = i === currentStep
            const isFuture = i > currentStep
            const cardCls = isCurrent
              ? 'border-gold-500 bg-gold-50 ring-[3px] ring-gold-100'
              : isDone
                ? 'border-forest-300 bg-forest-50 hover:border-forest-500'
                : 'border-gray-200 bg-white hover:border-forest-300'
            const numCls = isCurrent ? 'text-gold-700' : isDone ? 'text-green-600' : 'text-gray-400'
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onStepChange?.(i)}
                className={`text-left rounded-lg border-[1.5px] px-3 py-2.5 transition-all flex flex-col gap-0.5 ${cardCls} ${isFuture ? 'opacity-60' : ''}`}
              >
                <div className={`font-mono text-[10px] font-bold tracking-wide flex items-center gap-1 ${numCls}`}>
                  {isDone && <Check size={10} />}
                  ÉTAPE {String(i + 1).padStart(2, '0')}
                </div>
                <div className="text-[13px] font-semibold text-gray-900">{step.label}</div>
                <div className="text-[11px] text-gray-500 leading-snug">{STEP_SUBTITLES[step.key] ?? ''}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 0 && (
          <ObserverStep
            assessment={assessment}
            observations={props.observations}
            auditChecklist={props.auditChecklist}
            cadrageAnswers={props.cadrageAnswers}
            clientName={props.clientName}
            onObservationsChange={props.onObservationsChange}
            readOnly={readOnly}
          />
        )}
        {currentStep === 1 && (
          <DocumenterStep
            evidenceNotes={props.evidenceNotes}
            onEvidenceNotesChange={props.onEvidenceNotesChange}
            documents={props.documents}
            uploading={props.uploading}
            uploadError={props.uploadError}
            onUpload={props.onUpload}
            onDelete={props.onDeleteDoc}
            readOnly={readOnly}
          />
        )}
        {currentStep === 2 && (
          <AnalyserStep
            assessment={assessment}
            observations={props.observations}
            evidenceNotes={props.evidenceNotes}
            findingsHook={findingsHook}
            conformityLevel={props.conformityLevel as ConformityLevel | null}
            onConformityChange={props.onConformityChange as (v: ConformityLevel) => void}
            readOnly={readOnly}
          />
        )}
        {currentStep === 3 && (
          <ValidationStep
            assessment={assessment}
            observations={props.observations}
            findingsHook={findingsHook}
            onSubmit={props.onSubmit}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

