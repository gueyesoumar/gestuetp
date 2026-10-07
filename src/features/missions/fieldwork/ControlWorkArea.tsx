import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { ASSESSMENT_STATUS_CONFIG } from '../mission-constants'
import { ControlSinglePane } from './ControlSinglePane'
import { useMissionDocuments } from '../useMissionDocuments'
import { useToast } from '../../../hooks/useToast'
import { useAutosave } from '../../../hooks/useAutosave'
import { useAssessmentDeclineSource } from './useAssessmentDeclineSource'
import { useAssessmentFindings } from './findings/useAssessmentFindings'
import { ControlReviewView } from './ControlReviewView'
import { ControlReviewActions } from './ControlReviewActions'
import { ControlAuthoringFooter } from './ControlAuthoringFooter'
import { InterControlProvider } from './interControl'
import { CoherenceBannerConnected } from './CoherenceBanner'
import { ConformityJustificationModal } from './findings/ConformityJustificationModal'
import { isConformityCoherent, getIncoherenceMessage, findIncompleteNcFindings } from './findings/conformityRules'
import type { ConformityLevel } from '../mission-constants'
import type { AssessmentWithControl } from '../useAuditorAssessments'

interface ControlWorkAreaProps {
  assessment: AssessmentWithControl
  autoAdvance: boolean
  saving: boolean
  saveError: string | null
  isReviewer: boolean
  reviewerRole: 'lead' | 'associate' | 'none'
  leadApproved: boolean
  onToggleAutoAdvance: () => void
  onSave: (id: string, data: { evidence_notes: string; observations: string; conformity_level: string | null }, opts?: { silent?: boolean }) => Promise<boolean>
  onSubmit: (id: string, conformity_override_reason?: string | null) => Promise<boolean>
  onApprove?: (id: string, comment: string, stage?: string) => Promise<boolean>
  onReject?: (id: string, comment: string, stage?: string) => Promise<boolean>
}

function labelForReason(reason: string | null): string {
  if (reason === 'inexistant') return 'Inexistant'
  if (reason === 'non_applicable') return 'Non applicable'
  if (reason === 'confidentialite') return 'Confidentialité'
  return 'Non disponible'
}

export function ControlWorkArea({ assessment, autoAdvance, saving, saveError, isReviewer, reviewerRole, leadApproved, onToggleAutoAdvance, onSave, onSubmit, onApprove, onReject }: ControlWorkAreaProps){
  const toast = useToast()
  const [observations, setObservations] = useState(assessment.observations ?? '')
  const [evidenceNotes, setEvidenceNotes] = useState(assessment.evidence_notes ?? '')
  const [conformityLevel, setConformityLevel] = useState<string | null>(assessment.conformity_level ?? null)

  const findingsHook = useAssessmentFindings(assessment.id)

  const isSubmittedOrAbove = assessment.status === 'submitted' || assessment.status === 'in_review' || assessment.status === 'approved'
  const readOnly = isSubmittedOrAbove
  const canReview = isReviewer && isSubmittedOrAbove && assessment.status !== 'approved'

  const { documents, uploading: docUploading, uploadError: docUploadError, uploadDocument, deleteDocument } = useMissionDocuments(assessment.mission_id, canReview ? undefined : assessment.control_id)

  useEffect(() => {
    setObservations(assessment.observations ?? '')
    setEvidenceNotes(assessment.evidence_notes ?? '')
    setConformityLevel(assessment.conformity_level ?? null)
  }, [assessment.id, assessment.observations, assessment.evidence_notes, assessment.conformity_level])

  const declineSource = useAssessmentDeclineSource(assessment.id)
  const status = ASSESSMENT_STATUS_CONFIG[assessment.status]
  const findingsCount = findingsHook.findings.length
  // Voies express : Conforme (note auto-jointe) ou Non applicable (rien à évaluer)
  // sans constat → soumission directe autorisée.
  const isExpressConforme = findingsCount === 0 && conformityLevel === 'c'
  const isExpressNA = findingsCount === 0 && conformityLevel === 'na'
  const allowEmptySubmit = isExpressConforme || isExpressNA

  const formData = useMemo(() => ({
    evidence_notes: evidenceNotes, observations, conformity_level: conformityLevel,
  }), [evidenceNotes, observations, conformityLevel])

  const autosaveSave = useCallback(
    (data: typeof formData) => onSave(assessment.id, data, { silent: true }),
    [assessment.id, onSave],
  )
  const autosave = useAutosave({
    value: formData,
    onSave: autosaveSave,
    disabled: readOnly || canReview,
  })

  const flushRef = useRef(autosave.flush)
  useEffect(() => { flushRef.current = autosave.flush }, [autosave.flush])
  useEffect(() => {
    return () => { void flushRef.current() }
  }, [assessment.id])

  const handleSave = useCallback(async () => {
    const ok = await onSave(assessment.id, formData)
    if (ok) {
      toast.success('Travaux enregistrés', { description: assessment.control.code })
    }
  }, [assessment.id, assessment.control.code, formData, onSave, toast])

  const [justificationOpen, setJustificationOpen] = useState(false)

  const doSubmit = useCallback(async (reason: string | null) => {
    const saved = await onSave(assessment.id, formData)
    if (!saved) return
    const submitted = await onSubmit(assessment.id, reason)
    if (submitted) {
      toast.success('Travaux soumis pour revue', { description: `${assessment.control.code} · transmis au lead` })
      setJustificationOpen(false)
    }
  }, [assessment.id, assessment.control.code, formData, onSave, onSubmit, toast])

  const handleSubmit = useCallback(async () => {
    let currentFindings = findingsHook.findings
    if (currentFindings.length === 0) {
      if (conformityLevel === 'c') {
        // Voie express « Conforme » : un contrôle conforme sans écart n'exige plus
        // un constat factice. On joint automatiquement une observation standard,
        // cohérente avec le niveau Conforme (matrice métier), puis on soumet.
        const created = await findingsHook.addFinding({
          classification: 'observation',
          description: 'Conforme, aucun écart identifié.',
        })
        if (!created) {
          toast.error('Soumission impossible')
          return
        }
        currentFindings = [...currentFindings, created]
      } else if (conformityLevel === 'na') {
        // Voie express « Non applicable » : rien à évaluer, on soumet sans constat.
        await doSubmit(null)
        return
      } else {
        toast.warn('Au moins un constat requis', { description: 'Ajoutez un constat avant de soumettre.' })
        return
      }
    }
    // Variante B : blocage dur si NC majeure/mineure sans recommandation ou priorit&eacute;.
    const incomplete = findIncompleteNcFindings(currentFindings)
    if (incomplete.length > 0) {
      toast.warn(
        `${incomplete.length} non-conformité${incomplete.length > 1 ? 's' : ''} à compléter`,
        { description: 'Chaque NC majeure/mineure doit avoir une recommandation ET une priorité.' },
      )
      return
    }
    // Coherence findings <-> conformity_level : warning + justification obligatoire si incoherent.
    const coherent = isConformityCoherent(conformityLevel as ConformityLevel | null, currentFindings)
    if (!coherent) {
      setJustificationOpen(true)
      return
    }
    await doSubmit(null)
  }, [findingsHook, conformityLevel, doSubmit, toast])

  return (
    <InterControlProvider missionId={assessment.mission_id}>
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-sm font-semibold text-forest-700">{assessment.control.code}</span>
          <span className="text-[15px] font-semibold text-gray-900 truncate">{assessment.control.name}</span>
          <Badge label={status.label} variant={status.variant} />
        </div>
      </div>

      {assessment.control.description && (
        <div className="px-6 py-2 border-b border-gray-100 bg-[#FAFAF8] shrink-0">
          <p className="text-[12px] text-gray-500 truncate" title={assessment.control.description}>
            {assessment.control.description}
            <span className="text-gray-400"> &middot; d&eacute;tail dans l&apos;onglet Contexte &rarr;</span>
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 pb-4">

      {!canReview && (
        <CoherenceBannerConnected
          controlId={assessment.control_id}
          conformityLevel={conformityLevel}
          onAlign={(level) => setConformityLevel(level)}
          readOnly={readOnly}
        />
      )}

      {assessment.status === 'rejected' && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-red-600 shrink-0" />
          <p className="text-xs text-red-600 leading-relaxed">
            <strong>Rejet&eacute;</strong> &mdash; Veuillez corriger et resoumettre.
          </p>
        </div>
      )}

      {declineSource && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
          <Sparkles size={15} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-900 leading-relaxed">
            <strong>&Eacute;valuation pr&eacute;-remplie automatiquement.</strong>{' '}
            Une d&eacute;claration <em>{labelForReason(declineSource.reason)}</em> a &eacute;t&eacute; enregistr&eacute;e
            {declineSource.declinerName ? <> par <strong>{declineSource.declinerName}</strong></> : null}
            {' '}sur le document <em>&laquo;&nbsp;{declineSource.evidenceName}&nbsp;&raquo;</em>. Un constat a &eacute;t&eacute; pr&eacute;-cr&eacute;&eacute; &mdash; v&eacute;rifiez puis soumettez.
            {declineSource.justification && (
              <p className="mt-1.5 italic text-amber-800">&laquo;&nbsp;{declineSource.justification}&nbsp;&raquo;</p>
            )}
          </div>
        </div>
      )}

      {saveError && <div className="mx-6 mt-4"><ErrorAlert message={saveError} /></div>}

      {canReview ? (
        <ControlReviewView
          observations={observations}
          evidenceNotes={evidenceNotes}
          conformityLevel={conformityLevel}
          documents={documents}
          findings={findingsHook.findings}
        />
      ) : (
        <ControlSinglePane
          assessment={assessment}
          observations={observations}
          evidenceNotes={evidenceNotes}
          conformityLevel={conformityLevel}
          onConformityChange={setConformityLevel}
          documents={documents}
          uploading={docUploading}
          uploadError={docUploadError}
          onUpload={uploadDocument}
          onDeleteDoc={deleteDocument}
          findingsHook={findingsHook}
          onObservationsChange={setObservations}
          onEvidenceNotesChange={setEvidenceNotes}
          readOnly={readOnly}
          saving={saving}
        />
      )}

      </div>

      {canReview ? (
        <ControlReviewActions
          assessmentId={assessment.id}
          controlCode={assessment.control.code}
          reviewerRole={reviewerRole}
          leadApproved={leadApproved}
          onApprove={onApprove}
          onReject={onReject}
        />
      ) : (
        <ControlAuthoringFooter
          autoAdvance={autoAdvance}
          saving={saving}
          readOnly={readOnly}
          findingsCount={findingsCount}
          allowEmptySubmit={allowEmptySubmit}
          emptySubmitLabel={isExpressNA ? 'Soumettre — non applicable' : 'Soumettre — conforme'}
          autosave={autosave}
          onToggleAutoAdvance={onToggleAutoAdvance}
          onSave={handleSave}
          onSubmit={handleSubmit}
        />
      )}

      <ConformityJustificationModal
        open={justificationOpen}
        incoherenceMessage={getIncoherenceMessage(conformityLevel as ConformityLevel | null, findingsHook.findings) ?? ''}
        saving={saving}
        onConfirm={(reason) => { void doSubmit(reason) }}
        onCancel={() => setJustificationOpen(false)}
      />
    </div>
    </InterControlProvider>
  )
}
