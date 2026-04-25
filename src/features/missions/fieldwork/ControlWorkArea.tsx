import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, FileText, Check, X, Save, Play, ArrowLeft, ArrowRight } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { ASSESSMENT_STATUS_CONFIG, GUIDED_STEPS } from '../mission-constants'
import { GuidedWorkflow } from './GuidedWorkflow'
import { FreeWorkForm } from './FreeWorkForm'
import { useMissionDocuments } from '../useMissionDocuments'
import { useToast } from '../../../hooks/useToast'
import type { AssessmentWithControl } from '../useAuditorAssessments'

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
  onSave: (id: string, data: { findings: string; recommendations: string; evidence_notes: string; observations: string; risk_notes: string; conformity_level: string | null; finding_classification: string | null }) => Promise<boolean>
  onSubmit: (id: string) => Promise<boolean>
  onApprove?: (id: string, comment: string, stage?: string) => Promise<boolean>
  onReject?: (id: string, comment: string, stage?: string) => Promise<boolean>
}

export function ControlWorkArea({ assessment, mode, guidedStep, autoAdvance, saving, saveError, isReviewer, reviewerRole, leadApproved, onModeChange, onGuidedStepChange, onToggleAutoAdvance, onSave, onSubmit, onApprove, onReject }: ControlWorkAreaProps){
  const toast = useToast()
  const [reviewComment, setReviewComment] = useState('')
  const [reviewAction, setReviewAction] = useState<'idle' | 'approving' | 'rejecting'>('idle')
  const [observations, setObservations] = useState(assessment.observations ?? '')
  const [findings, setFindings] = useState(assessment.findings ?? '')
  const [recommendations, setRecommendations] = useState(assessment.recommendations ?? '')
  const [evidenceNotes, setEvidenceNotes] = useState(assessment.evidence_notes ?? '')
  const [riskNotes, setRiskNotes] = useState(assessment.risk_notes ?? '')
  const [conformityLevel, setConformityLevel] = useState<string | null>(assessment.conformity_level ?? null)
  const [findingClassification, setFindingClassification] = useState<string | null>(assessment.finding_classification ?? null)

  const isSubmittedOrAbove = assessment.status === 'submitted' || assessment.status === 'in_review' || assessment.status === 'approved'
  const readOnly = isSubmittedOrAbove
  // Both lead and associate see the review view; associate buttons are disabled until lead approves
  const canReview = isReviewer && isSubmittedOrAbove && assessment.status !== 'approved'
  const canAct = reviewerRole === 'lead' || (reviewerRole === 'associate' && leadApproved)
  const waitingForLead = reviewerRole === 'associate' && !leadApproved && assessment.status !== 'approved'

  // Reviewer sees all mission docs; auditor sees control-specific docs
  const { documents, uploading: docUploading, uploadError: docUploadError, uploadDocument, deleteDocument } = useMissionDocuments(assessment.mission_id, canReview ? undefined : assessment.control_id)

  useEffect(() => {
    setObservations(assessment.observations ?? '')
    setFindings(assessment.findings ?? '')
    setRecommendations(assessment.recommendations ?? '')
    setEvidenceNotes(assessment.evidence_notes ?? '')
    setRiskNotes(assessment.risk_notes ?? '')
    setConformityLevel(assessment.conformity_level ?? null)
    setFindingClassification(assessment.finding_classification ?? null)
  }, [assessment.id])

  const status = ASSESSMENT_STATUS_CONFIG[assessment.status]
  const canGoNext = guidedStep < GUIDED_STEPS.length - 1
  const canGoPrev = guidedStep > 0

  const handleSave = useCallback(async () => {
    const ok = await onSave(assessment.id, { findings, recommendations, evidence_notes: evidenceNotes, observations, risk_notes: riskNotes, conformity_level: conformityLevel, finding_classification: findingClassification })
    if (ok) {
      toast.success('Travaux enregistrés', { description: assessment.control.code })
    }
  }, [assessment.id, assessment.control.code, findings, recommendations, evidenceNotes, observations, riskNotes, conformityLevel, findingClassification, onSave, toast])

  const handleSubmit = useCallback(async () => {
    const saved = await onSave(assessment.id, { findings, recommendations, evidence_notes: evidenceNotes, observations, risk_notes: riskNotes, conformity_level: conformityLevel, finding_classification: findingClassification })
    if (saved) {
      const submitted = await onSubmit(assessment.id)
      if (submitted) {
        toast.success('Travaux soumis pour revue', { description: `${assessment.control.code} · transmis au lead` })
      }
    }
  }, [assessment.id, assessment.control.code, findings, recommendations, evidenceNotes, observations, riskNotes, conformityLevel, findingClassification, onSave, onSubmit, toast])

  const handleNext = useCallback(() => {
    if (canGoNext) onGuidedStepChange(guidedStep + 1)
  }, [canGoNext, guidedStep, onGuidedStepChange])

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {/* Top bar */}
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

      {/* Rejected banner */}
      {assessment.status === 'rejected' && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-red-600 shrink-0" />
          <p className="text-xs text-red-600 leading-relaxed">
            <strong>Rejet&eacute;</strong> &mdash; Veuillez corriger et resoumettre.
          </p>
        </div>
      )}

      {saveError && <div className="mx-6 mt-4"><ErrorAlert message={saveError} /></div>}

      {/* Review mode: show all info in one view */}
      {canReview ? (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Conformity level */}
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
              {conformityLevel === 'c' ? 'Conforme' : conformityLevel === 'lc' ? 'Largement conforme' : conformityLevel === 'pc' ? 'Partiellement conforme' : conformityLevel === 'nc' ? 'Non conforme' : conformityLevel === 'na' ? 'Non applicable' : 'Non \u00e9valu\u00e9'}
            </span>
          </div>

          {/* Finding classification */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Classification du constat</p>
            <div className="flex gap-2">
              {[
                { key: 'major_nc', label: 'NC Majeure', color: 'bg-red-50 text-red-600 border-red-200' },
                { key: 'minor_nc', label: 'NC Mineure', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                { key: 'observation', label: 'Observation', color: 'bg-blue-50 text-blue-600 border-blue-200' },
                { key: 'strength', label: 'Point fort', color: 'bg-green-50 text-green-600 border-green-200' },
              ].map((cls) => (
                <span key={cls.key} className={`text-[11px] font-medium px-3 py-1 rounded-full border ${findingClassification === cls.key ? cls.color : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                  {cls.label}
                </span>
              ))}
            </div>
          </div>

          {/* Observations */}
          {observations && (
            <ReviewSection title="Observations terrain" content={observations} />
          )}

          {/* Evidence notes */}
          {evidenceNotes && (
            <ReviewSection title="Notes sur les preuves" content={evidenceNotes} />
          )}

          {/* Documents */}
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

          {/* Findings */}
          <ReviewSection title="Constats" content={findings} highlight />

          {/* Recommendations */}
          {recommendations && (
            <ReviewSection title="Recommandations" content={recommendations} />
          )}

          {/* Risk notes */}
          {riskNotes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Risque identifi&eacute;</p>
              <div className="p-3 bg-orange-50 border-l-2 border-orange-400 rounded-lg text-xs text-orange-700 leading-relaxed">
                <AlertTriangle size={13} className="inline mr-1" />{riskNotes}
              </div>
            </div>
          )}

          {/* Empty state if nothing to show */}
          {!observations && !findings && !evidenceNotes && documents.length === 0 && (
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
          findings={findings}
          recommendations={recommendations}
          riskNotes={riskNotes}
          documents={documents}
          uploading={docUploading}
          uploadError={docUploadError}
          onUpload={uploadDocument}
          onDeleteDoc={deleteDocument}
          onObservationsChange={setObservations}
          onEvidenceNotesChange={setEvidenceNotes}
          onFindingsChange={setFindings}
          onRecommendationsChange={setRecommendations}
          onRiskNotesChange={setRiskNotes}
          conformityLevel={conformityLevel}
          onConformityChange={setConformityLevel}
          findingClassification={findingClassification}
          onFindingClassificationChange={setFindingClassification}
          onSubmit={handleSubmit}
          saving={saving}
          readOnly={readOnly}
        />
      ) : (
        <FreeWorkForm
          assessment={assessment}
          observations={observations}
          evidenceNotes={evidenceNotes}
          findings={findings}
          recommendations={recommendations}
          onObservationsChange={setObservations}
          onEvidenceNotesChange={setEvidenceNotes}
          onFindingsChange={setFindings}
          onRecommendationsChange={setRecommendations}
          readOnly={readOnly}
        />
      )}

      {/* Footer */}
      {canReview ? (
        /* Review footer for lead/associate */
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
                if (ok) toast.success('Validation enregistrée', { description: assessment.control.code })
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
                if (ok) toast.warn('Constat rejeté', { description: `${assessment.control.code} · renvoyé à l'auditeur` })
              }}
              disabled={!canAct || reviewAction !== 'idle'}
              className="flex-1 px-4 py-2.5 bg-white text-red-600 border border-red-400 rounded-lg text-[13px] font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {reviewAction === 'rejecting' ? 'Rejet...' : <><X size={14} className="inline" /> Rejeter</>}
            </button>
          </div>
        </div>
      ) : (
        /* Normal footer for auditor */
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-[#FAFAFA] sticky bottom-0">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <div onClick={onToggleAutoAdvance} className={`w-8 h-[18px] rounded-full relative cursor-pointer transition-colors ${autoAdvance ? 'bg-forest-500' : 'bg-gray-200'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] shadow-sm transition-all ${autoAdvance ? 'left-[18px]' : 'left-[2px]'}`} />
              </div>
              Auto-avance
            </label>
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
              <button onClick={handleSubmit} disabled={saving || !findings.trim()} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <Play size={13} /> Soumettre
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewSection({ title, content, highlight }: { title: string; content: string; highlight?: boolean }): JSX.Element | null {
  if (!content) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{title}</p>
      <div className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
        highlight ? 'bg-forest-50 border border-forest-200 text-forest-900' : 'bg-gray-50 border border-gray-200 text-gray-700'
      }`}>
        {content}
      </div>
    </div>
  )
}
