import { FindingsEditor } from './findings/FindingsEditor'
import { ControlVerdictCard } from './findings/ControlVerdictCard'
import { ControlExpressLane } from './ControlExpressLane'
import { AiPreAnalysisSection } from './AiPreAnalysisSection'
import { ExpectedEvidenceSection } from './ExpectedEvidenceSection'
import { DocumenterStep } from './steps/DocumenterStep'
import { useInterControlCtx } from './interControl'
import { useToast } from '../../../hooks/useToast'
import type { ExpectedEvidence } from './useControlExpectedEvidence'
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
  const interControl = useInterControlCtx()
  const toast = useToast()

  // Constat rattaché à une preuve : créé sur le contrôle courant puis propagé (systémique)
  // aux contrôles modifiables partageant la même preuve canonique.
  const createEvidenceFinding = async (item: ExpectedEvidence): Promise<void> => {
    const created = await findingsHook.addFinding({
      classification: 'minor_nc',
      description: `Preuve manquante ou insuffisante : ${item.name}`,
      evidence_item_id: item.evidenceItemId,
    })
    if (!created) { toast.error('Création du constat impossible'); return }
    if (interControl && item.evidenceItemId) {
      const targets = interControl.evidenceTargets(item.evidenceItemId, assessment.control_id)
      if (targets.length > 0) {
        const groupId = crypto.randomUUID()
        const okOrigin = await findingsHook.updateFinding(created.id, { systemic_group_id: groupId, is_systemic_origin: true })
        const okMirrors = okOrigin && await interControl.createSystemic(created, targets.map((t) => t.assessmentId), groupId)
        if (okOrigin && okMirrors) {
          interControl.refetch()
          toast.success('Constat créé et propagé', { description: `${targets.length + 1} contrôles partageant « ${item.name} »` })
          return
        }
      }
    }
    toast.success('Constat créé', { description: item.name })
  }

  return (
    <div className="p-6 space-y-5">
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

      <ExpectedEvidenceSection
        missionId={assessment.mission_id}
        controlId={assessment.control_id}
        onCreateFinding={readOnly ? undefined : (item) => { void createEvidenceFinding(item) }}
      />

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
