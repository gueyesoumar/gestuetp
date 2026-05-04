import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AlertTriangle, FileText, Check, X, Save, Play, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { AutosaveIndicator } from '../../../components/ui/AutosaveIndicator'
import { SafeMarkdown } from '../../../components/ui/SafeMarkdown'
import { ASSESSMENT_STATUS_CONFIG, GUIDED_STEPS } from '../mission-constants'
import { GuidedWorkflow } from './GuidedWorkflow'
import { FreeWorkForm } from './FreeWorkForm'
import { useMissionDocuments } from '../useMissionDocuments'
import { useToast } from '../../../hooks/useToast'
import { useAutosave } from '../../../hooks/useAutosave'
import { useAssessmentDeclineSource } from './useAssessmentDeclineSource'
import { useAssessmentFindings } from './findings/useAssessmentFindings'
import { useControlContext } from './right-rail/useControlContext'
import { CadrageInline } from './right-rail/CadrageInline'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { FindingClassification } from './findings/useAssessmentFindings'

interface ControlWorkAreaProps {
  assessment: AssessmentWithControl
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

const FINDING_LABELS: Record<FindingClassification, { label: string; color: string }> = {
  major_nc: { label: 'NC majeure', color: 'bg-red-50 text-red-700 border-red-300' },
  minor_nc: { label: 'NC mineure', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  observation: { label: 'Observation', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  strength: { label: 'Point fort', color: 'bg-green-50 text-green-700 border-green-300' },
}

export function ControlWorkArea({ assessment, mode, guidedStep, autoAdvance, saving, saveError, isReviewer, reviewerRole, leadApproved, onModeChange, onGuidedStepChange, onToggleAutoAdvance, onSave, onSubmit, onApprove, onReject }: ControlWorkAreaProps){
  const toast = useToast()
  const [reviewComment, setReviewComment] = useState('')
  const [reviewAction, setReviewAction] = useState<'idle' | 'approving' | 'rejecting'>('idle')
  const [observations, setObservations] = useState(assessment.observations ?? '')
  const [evidenceNotes, setEvidenceNotes] = useState(assessment.evidence_notes ?? '')
  const [conformityLevel, setConformityLevel] = useState<string | null>(assessment.conformity_level ?? null)

  const findingsHook = useAssessmentFindings(assessment.id)
  const controlContext = useControlContext(assessment.mission_id, assessment.control_id)

  const isSubmittedOrAbove = assessment.status === 'submitted' || assessment.status === 'in_review' || assessment.status === 'approved'
  const readOnly = isSubmittedOrAbove
  const canReview = isReviewer && isSubmittedOrAbove && assessment.status !== 'approved'
  const canAct = reviewerRole === 'lead' || (reviewerRole === 'associate' && leadApproved)
  const waitingForLead = reviewerRole === 'associate' && !leadApproved && assessment.status !== 'approved'

  const { documents, uploading: docUploading, uploadError: docUploadError, uploadDocument, deleteDocument } = useMissionDocuments(assessment.mission_id, canReview ? undefined : assessment.control_id)

  useEffect(() => {
    setObservations(assessment.observations ?? '')
    setEvidenceNotes(assessment.evidence_notes ?? '')
    setConformityLevel(assessment.conformity_level ?? null)
  }, [assessment.id, assessment.observations, assessment.evidence_notes, assessment.conformity_level])

  const declineSource = useAssessmentDeclineSource(assessment.id)
  const status = ASSESSMENT_STATUS_CONFIG[assessment.status]
  const canGoNext = guidedStep < GUIDED_STEPS.length - 1
  const canGoPrev = guidedStep > 0
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
      toast.success('Travaux enregistr&eacute;s', { description: assessment.control.code })
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

  const handleNext = useCallback(() => {
    if (canGoNext) onGuidedStepChange(guidedStep + 1)
  }, [canGoNext, guidedStep, onGuidedStepChange])

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
            <button onClick={() => onModeChange('guided')} className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${mode === 'guided' ? 'bg-forest-700 text-white' : 'text-gray-500'}`}>
              Guid&eacute;
            </button>
            <button onClick={() => onModeChange('libre')} className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${mode === 'libre' ? 'bg-forest-700 text-white' : 'text-gray-500'}`}>
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

      {/* Inline cadrage answers — visible across guided/libre views (not in review) */}
      {!canReview && controlContext.cadrageAnswers.length > 0 && (
        <div className="mx-6 mt-4">
          <CadrageInline answers={controlContext.cadrageAnswers} />
        </div>
      )}

      {canReview ? (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase text-gray-400">Niveau de conformit&eacute;</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              conformityLevel === 'c' ? 'bg-green-50 text-green-600' :
              conformityLevel === 'lc' ? 'bg-forest-50 text-forest-700' :
              conformityLevel === 'pc' ? 'bg-gold-50 text-gold-600' :
              conformityLevel === 'nc' ? 'bg-red-50 text-red-600' :
              conformityLevel === 'na' ? 'bg-gray-50 text-gray-500' :
              'bg-gray-50 text-gray-300'
            }`}>
              {conformityLevel === 'c' ? 'Conforme' : conformityLevel === 'lc' ? 'Largement conforme' : conformityLevel === 'pc' ? 'Partiellement conforme' : conformityLevel === 'nc' ? 'Non conforme' : conformityLevel === 'na' ? 'Non applicable' : 'Non &eacute;valu&eacute;'}
            </span>
          </div>

          {observations && (
            <ReviewSection title="Observations terrain" content={observations} />
          )}

          {evidenceNotes && (
            <ReviewSection title="Notes sur les preuves" content={evidenceNotes} />
          )}

          {documents.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Documents joints ({documents.length})</p>
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-forest-50 border border-forest-200 rounded-lg">
                    <FileText size={15} />
                    <span className="text-xs text-gray-700 truncate flex-1">{doc.file_name}</span>
                    <span className="text-[10px] text-gray-300">{doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} Ko` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Constats ({findingsHook.findings.length})</p>
            {findingsHook.findings.length === 0 && (
              <p className="text-xs italic text-gray-300">Aucun constat soumis.</p>
            )}
            <div className="space-y-2">
              {findingsHook.findings.map((f) => {
                const cfg = FINDING_LABELS[f.classification]
                return (
                  <div key={f.id} className={`border rounded-lg p-3 ${cfg.color}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide">{cfg.label}</span>
                      {f.priority && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/60 border border-current/20">{f.priority}</span>}
                      {f.proposed_deadline && <span className="text-[9px] text-current/70 ml-auto">&Eacute;ch&eacute;ance : {f.proposed_deadline}</span>}
                    </div>
                    <SafeMarkdown className="text-[12px] text-gray-900 leading-relaxed">{f.description}</SafeMarkdown>
                    {f.risk && (
                      <p className="text-[11px] text-gray-700 mt-1.5"><span className="font-semibold">Risque :</span> <SafeMarkdown inline>{f.risk}</SafeMarkdown></p>
                    )}
                    {f.recommendation && (
                      <p className="text-[11px] text-gray-700 mt-1"><span className="font-semibold">Reco :</span> <SafeMarkdown inline>{f.recommendation}</SafeMarkdown></p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {!observations && findingsHook.findings.length === 0 && !evidenceNotes && documents.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-300">
              Aucune information soumise pour ce contr&ocirc;le.
            </div>
          )}
        </div>
      ) : mode === 'guided' ? (
        <GuidedWorkflow
          assessment={assessment}
          currentStep={guidedStep}
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
        <div className="px-6 py-4 border-t border-gray-200 bg-[#FAFAFA] sticky bottom-0">
          {waitingForLead && (
            <div className="flex items-center gap-2 p-2.5 mb-3 bg-gold-50 border border-gold-200 rounded-lg">
              <AlertTriangle size={15} className="text-gold-600" />
              <p className="text-[11px] text-gold-700">En attente de la validation du chef de mission avant votre approbation.</p>
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <input
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Commentaire de revue (optionnel)..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500"
              disabled={!canAct}
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={async () => {
                if (!onApprove || !canAct) return
                setReviewAction('approving')
                const stage = reviewerRole === 'associate' ? 'associate_review' : 'lead_review'
                const ok = await onApprove(assessment.id, reviewComment, stage)
                setReviewComment('')
                setReviewAction('idle')
                if (ok) toast.success('Validation enregistr&eacute;e', { description: assessment.control.code })
              }}
              disabled={!canAct || reviewAction !== 'idle'}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-[13px] font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {reviewAction === 'approving' ? 'Validation...' : <><Check size={14} className="inline" /> Approuver</>}
            </button>
            <button
              onClick={async () => {
                if (!onReject || !canAct) return
                setReviewAction('rejecting')
                const stage = reviewerRole === 'associate' ? 'associate_review' : 'lead_review'
                const ok = await onReject(assessment.id, reviewComment, stage)
                setReviewComment('')
                setReviewAction('idle')
                if (ok) toast.warn('Constat rejet&eacute;', { description: `${assessment.control.code} · renvoy&eacute; &agrave; l'auditeur` })
              }}
              disabled={!canAct || reviewAction !== 'idle'}
              className="flex-1 px-4 py-2.5 bg-white text-red-600 border border-red-400 rounded-lg text-[13px] font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {reviewAction === 'rejecting' ? 'Rejet...' : <><X size={14} className="inline" /> Rejeter</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-[#FAFAFA] sticky bottom-0">
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
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 bg-white hover:bg-forest-50 hover:border-forest-300 disabled:opacity-50 transition-colors">
                <Save size={13} className="inline" /> Enregistrer
              </button>
            )}
            {mode === 'guided' && canGoNext && guidedStep < 3 && (
              <button onClick={handleNext} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors">
                {GUIDED_STEPS[guidedStep + 1].label} <ArrowRight size={12} className="inline" />
              </button>
            )}
            {mode === 'libre' && !readOnly && (
              <button onClick={handleSubmit} disabled={saving || findingsCount === 0} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <Play size={13} /> Soumettre
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function labelForReason(reason: string | null): string {
  if (reason === 'inexistant') return 'Inexistant'
  if (reason === 'non_applicable') return 'Non applicable'
  if (reason === 'confidentialite') return 'Confidentialité'
  return 'Non disponible'
}

function ReviewSection({ title, content }: { title: string; content: string }): JSX.Element | null {
  if (!content) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{title}</p>
      <div className="p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-200 text-gray-700">
        {content}
      </div>
    </div>
  )
}
