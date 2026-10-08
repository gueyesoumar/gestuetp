import { useMissionDocuments } from '../../useMissionDocuments'
import { ExpectedEvidenceSection } from '../ExpectedEvidenceSection'
import { DocumenterStep } from '../steps/DocumenterStep'
import type { AssessmentWithControl } from '../../useAuditorAssessments'

interface ControlEvidenceTabProps {
  assessment: AssessmentWithControl
  missionId: string
}

/**
 * Onglet Preuves du rail : preuves attendues (avec dépôt par preuve) + autres
 * documents. Déplacé depuis la zone centrale pour l'alléger. Gère ses propres
 * documents (useMissionDocuments) ; dépôt possible tant que l'évaluation est modifiable.
 */
export function ControlEvidenceTab({ assessment, missionId }: ControlEvidenceTabProps) {
  const { documents, uploading, uploadError, uploadDocument, deleteDocument } = useMissionDocuments(missionId, assessment.control_id)
  const readOnly = !(assessment.status === 'draft' || assessment.status === 'rejected')

  return (
    <div className="p-3 space-y-3">
      <ExpectedEvidenceSection
        missionId={missionId}
        controlId={assessment.control_id}
        onUpload={readOnly ? undefined : uploadDocument}
        uploading={uploading}
      />
      <DocumenterStep
        documents={documents}
        uploading={uploading}
        uploadError={uploadError}
        onUpload={uploadDocument}
        onDelete={deleteDocument}
        readOnly={readOnly}
      />
    </div>
  )
}
