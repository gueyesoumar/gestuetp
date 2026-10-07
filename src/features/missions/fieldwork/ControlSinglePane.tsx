import { FindingsEditor } from './findings/FindingsEditor'
import { ControlVerdictCard } from './findings/ControlVerdictCard'
import { ControlExpressLane } from './ControlExpressLane'
import { AiPreAnalysisSection } from './AiPreAnalysisSection'
import { ExpectedEvidenceSection } from './ExpectedEvidenceSection'
import { DocumenterStep } from './steps/DocumenterStep'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { UseAssessmentFindingsReturn } from './findings/useAssessmentFindings'
import type { Document } from '../../../types/database.types'

interface ControlSinglePaneProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  conformityLevel: string | null
  onConformityChange: (v: string) => void
  documents: Document[]
  uploading: boolean
  uploadError: string | null
  onUpload: (file: File, description: string) => Promise<boolean>
  onDeleteDoc: (docId: string, filePath: string) => Promise<boolean>
  findingsHook: UseAssessmentFindingsReturn
  onObservationsChange: (v: string) => void
  onEvidenceNotesChange: (v: string) => void
  readOnly: boolean
  saving: boolean
  /** Voie express : fixe le niveau et soumet directement (sans constat). */
  onExpressSubmit: (level: 'c' | 'na') => void
}

/**
 * Écran unique d'évaluation d'un contrôle (remplace le wizard guidé + le mode
 * libre) : voie express → verdict → observations → pré-analyse IA → constats →
 * preuves. Soumission pilotée par ControlAuthoringFooter.
 */
export function ControlSinglePane(props: ControlSinglePaneProps) {
  const { assessment, readOnly, findingsHook } = props

  return (
    <div className="p-6 space-y-5">
      {assessment.control.description && (
        <div className="bg-[#FAFAF8] border border-gray-100 rounded-lg p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Description</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">{assessment.control.description}</p>
        </div>
      )}

      {!readOnly && (
        <ControlExpressLane
          disabled={props.saving || findingsHook.findings.length > 0}
          onExpress={props.onExpressSubmit}
        />
      )}

      <ControlVerdictCard
        conformityLevel={props.conformityLevel}
        findings={findingsHook.findings}
        readOnly={readOnly}
        onChange={props.onConformityChange}
      />

      <Field label="Observations terrain" value={props.observations} onChange={props.onObservationsChange} disabled={readOnly}
        placeholder="Notez ce que vous avez observ&eacute;..." rows={3} />

      <AiPreAnalysisSection
        assessment={assessment}
        observations={props.observations}
        evidenceNotes={props.evidenceNotes}
        findingsHook={findingsHook}
        conformityLevel={props.conformityLevel}
        onConformityChange={props.onConformityChange}
        readOnly={readOnly}
      />

      <FindingsEditor
        findingsHook={findingsHook}
        readOnly={readOnly}
        checklistSuggestions={(assessment.control.audit_checklist ?? []).map((i) => i.label)}
        assessment={assessment}
      />

      <ExpectedEvidenceSection missionId={assessment.mission_id} controlId={assessment.control_id} />

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
    </div>
  )
}

function Field({ label, value, onChange, disabled, placeholder, rows, required }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean; placeholder: string; rows: number; required?: boolean
}){
  return (
    <div>
      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y disabled:bg-gray-50"
      />
    </div>
  )
}
