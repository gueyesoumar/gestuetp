import { GUIDED_STEPS } from '../mission-constants'
import { ObserverStep } from './steps/ObserverStep'
import { DocumenterStep } from './steps/DocumenterStep'
import { AnalyserStep } from './steps/AnalyserStep'
import { ValidationStep } from './steps/ValidationStep'
import type { AssessmentWithControl } from '../useAuditorAssessments'

import type { Document } from '../../../types/database.types'

interface GuidedWorkflowProps {
  assessment: AssessmentWithControl
  currentStep: number
  observations: string
  evidenceNotes: string
  findings: string
  recommendations: string
  riskNotes: string
  documents: Document[]
  uploading: boolean
  uploadError: string | null
  onUpload: (file: File, description: string) => Promise<boolean>
  onDeleteDoc: (docId: string, filePath: string) => Promise<boolean>
  onObservationsChange: (v: string) => void
  onEvidenceNotesChange: (v: string) => void
  onFindingsChange: (v: string) => void
  onRecommendationsChange: (v: string) => void
  onRiskNotesChange: (v: string) => void
  conformityLevel: string | null
  onConformityChange: (v: string) => void
  onSubmit: () => void
  saving: boolean
  readOnly: boolean
}

export function GuidedWorkflow(props: GuidedWorkflowProps){
  const { assessment, currentStep, saving, readOnly } = props

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Step pipeline */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200 gap-0">
        {GUIDED_STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center">
            {i > 0 && <div className={`w-8 h-0.5 mx-1.5 shrink-0 ${i <= currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />}
            <div className="flex items-center gap-2">
              <StepDot index={i} current={currentStep} />
              <span className={`text-xs font-medium whitespace-nowrap ${
                i < currentStep ? 'text-green-600' : i === currentStep ? 'text-forest-700 font-semibold' : 'text-gray-300'
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 0 && (
          <ObserverStep
            assessment={assessment}
            observations={props.observations}
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
            documents={props.documents}
            findings={props.findings}
            recommendations={props.recommendations}
            riskNotes={props.riskNotes}
            onFindingsChange={props.onFindingsChange}
            onRecommendationsChange={props.onRecommendationsChange}
            onRiskNotesChange={props.onRiskNotesChange}
            conformityLevel={props.conformityLevel as import('../mission-constants').ConformityLevel | null}
            onConformityChange={props.onConformityChange as (v: import('../mission-constants').ConformityLevel) => void}
            readOnly={readOnly}
          />
        )}
        {currentStep === 3 && (
          <ValidationStep
            assessment={assessment}
            observations={props.observations}
            findings={props.findings}
            recommendations={props.recommendations}
            onSubmit={props.onSubmit}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

function StepDot({ index, current }: { index: number; current: number }){
  const base = 'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0'
  if (index < current) return <div className={`${base} bg-green-600 text-white`}>&#10003;</div>
  if (index === current) return <div className={`${base} bg-forest-700 text-white shadow-[0_0_0_3px_theme(colors.forest.100)]`}>{index + 1}</div>
  return <div className={`${base} bg-white text-gray-300 border-2 border-gray-200`}>{index + 1}</div>
}
