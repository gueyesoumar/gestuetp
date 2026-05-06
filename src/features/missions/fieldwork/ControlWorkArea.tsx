import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { ASSESSMENT_STATUS_CONFIG } from '../mission-constants'
import { GuidedWorkflow } from './GuidedWorkflow'
import { FreeWorkForm } from './FreeWorkForm'
import { useMissionDocuments } from '../useMissionDocuments'
import { useToast } from '../../../hooks/useToast'
import { useAutosave } from '../../../hooks/useAutosave'
import { useAssessmentDeclineSource } from './useAssessmentDeclineSource'
import { useAssessmentFindings } from './findings/useAssessmentFindings'
import { useControlContext } from './right-rail/useControlContext'
import { useInterviewNotesForControl } from './right-rail/useInterviewNotesForControl'
import { CadrageInline } from './right-rail/CadrageInline'
import { InterviewNotesInline } from './right-rail/InterviewNotesInline'
import { ControlReviewView } from './ControlReviewView'
import { ControlReviewActions } from './ControlReviewActions'
import { ControlAuthoringFooter } from './ControlAuthoringFooter'
import { ControlStatementCard } from './ControlStatementCard'
import type { AssessmentWithControl } from '../useAuditorAssessments'

interface ControlWorkAreaProps {
  assessment: AssessmentWithControl
  clientName?: string | null
  mode: 'guided' | 'libre'
  guidedStep: number
  autoAdvance: boolean
  saving: boolean
  saveError: string | null
  isReviewer: boolean
  reviewerRole: 'lead' | 'associate' | 'none'
  leadApproved: boolean
  onModeChange: (mode: 'guided' | 'libre') => void
  onGuidedStepChange: (step: number) => void
  onToggleAutoAdvance: () => void
  onSave: (id: string, data: { evidence_notes: string; observations: string; conformity_level: string | null }, opts?: { silent?: boolean }) => Promise<boolean>
  onSubmit: (id: string) => Promise<boolean>
  onApprove?: (id: string, comment: string, stage?: string) => Promise<boolean>
  onReject?: (id: string, comment: string, stage?: string) => Promise<boolean>
}

function labelForReason(reason: string | null): string {
  if (reason === 'inexistant') return 'Inexistant'
  if (reason === 'non_applicable') return 'Non applicable'
  if (reason === 'confidentialite') return 'Confidentialité'
  return 'Non disponible'
}

export function ControlWorkArea({ assessment, clientName, mode, guidedStep, autoAdvance, saving, saveError, isReviewer, reviewerRole, leadApproved, onModeChange, onGuidedStepChange, onToggleAutoAdvance, onSave, onSubmit, onApprove, onReject }: ControlWorkAreaProps){
  const toast = useToast()
  const [observations, setObservations] = useState(assessment.observations ?? '')
  const [evidenceNotes, setEvidenceNotes] = useState(assessment.evidence_notes ?? '')
  const [conformityLevel, setConformityLevel] = useState<string | null>(assessment.conformity_level ?? null)

  const findingsHook = useAssessmentFindings(assessment.id)
  const controlContext = useControlContext(assessment.mission_id, assessment.control_id)
  const { snippets: interviewNotes } = useInterviewNotesForControl(assessment.mission_id, assessment.control.code)

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

  const handleSubmit = useCallback(async () => {
    if (findingsCount === 0) {
      toast.warn('Au moins un constat requis', { description: 'Ajoutez un constat avant de soumettre.' })
      return
    }
    const saved = await onSave(assessment.id, formData)
    if (saved) {
      const submitted = await onSubmit(assessment.id)
      if (submitted) {
        toast.success('Travaux soumis pour revue', { description: `${assessment.control.code} · transmis au lead` })
      }
    }
  }, [assessment.id, assessment.control.code, findingsCount, formData, onSave, onSubmit, toast])

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-sm font-semibold text-forest-700">{assessment.control.code}</span>
          <span className="text-[15px] font-semibold text-gray-900 truncate">{assessment.control.name}</span>
          <Badge label={status.label} variant={status.variant} />
        </div>
        {!canReview && (
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-[#FAFAF8] shrink-0">
            <button onClick={() => onModeChange('guided')} className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${mode === 'guided' ? 'bg-forest-50 text-forest-900' : 'text-gray-500 hover:text-forest-700'}`}>
              Guid&eacute;
            </button>
            <button onClick={() => onModeChange('libre')} className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${mode === 'libre' ? 'bg-forest-50 text-forest-900' : 'text-gray-500 hover:text-forest-700'}`}>
              Libre
            </button>
          </div>
        )}
      </div>

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

      <div className="mx-6 mt-4">
        <ControlStatementCard
          description={assessment.control.description}
          guidance={assessment.control.guidance}
          riskLevel={assessment.control.risk_level}
        />
      </div>

      {!canReview && controlContext.cadrageAnswers.length > 0 && (
        <div className="mx-6 mt-4">
          <CadrageInline answers={controlContext.cadrageAnswers} />
        </div>
      )}

      {!canReview && interviewNotes.length > 0 && (
        <div className="mx-6 mt-4">
          <InterviewNotesInline snippets={interviewNotes} />
        </div>
      )}

      {canReview ? (
        <ControlReviewView
          observations={observations}
          evidenceNotes={evidenceNotes}
          conformityLevel={conformityLevel}
          documents={documents}
          findings={findingsHook.findings}
        />
      ) : mode === 'guided' ? (
        <GuidedWorkflow
          assessment={assessment}
          currentStep={guidedStep}
          onStepChange={onGuidedStepChange}
          observations={observations}
          evidenceNotes={evidenceNotes}
          documents={documents}
          uploading={docUploading}
          uploadError={docUploadError}
          onUpload={uploadDocument}
          onDeleteDoc={deleteDocument}
          onObservationsChange={setObservations}
          onEvidenceNotesChange={setEvidenceNotes}
          conformityLevel={conformityLevel}
          onConformityChange={setConformityLevel}
          findingsHook={findingsHook}
          auditChecklist={controlContext.auditChecklist}
          cadrageAnswers={controlContext.cadrageAnswers}
          clientName={clientName}
          onSubmit={handleSubmit}
          saving={saving}
          readOnly={readOnly}
        />
      ) : (
        <FreeWorkForm
          assessment={assessment}
          observations={observations}
          evidenceNotes={evidenceNotes}
          findingsHook={findingsHook}
          onObservationsChange={setObservations}
          onEvidenceNotesChange={setEvidenceNotes}
          readOnly={readOnly}
        />
      )}

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
          mode={mode}
          guidedStep={guidedStep}
          autoAdvance={autoAdvance}
          saving={saving}
          readOnly={readOnly}
          findingsCount={findingsCount}
          autosave={autosave}
          onToggleAutoAdvance={onToggleAutoAdvance}
          onGuidedStepChange={onGuidedStepChange}
          onSave={handleSave}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
