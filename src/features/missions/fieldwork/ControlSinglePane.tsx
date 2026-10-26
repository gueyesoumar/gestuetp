import { FindingsEditor } from './findings/FindingsEditor'
import { ControlVerdictCard } from './findings/ControlVerdictCard'
import { AiPreAnalysisSection } from './AiPreAnalysisSection'
import { CadrageInline } from './right-rail/CadrageInline'
import { useControlContext } from './right-rail/useControlContext'
import { useReviewBaseline } from './review/useReviewBaseline'
import { ReviewPreviousPanel } from './review/ReviewPreviousPanel'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { UseAssessmentFindingsReturn } from './findings/useAssessmentFindings'

interface ControlSinglePaneProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  conformityLevel: string | null
  onConformityChange: (v: string) => void
  findingsHook: UseAssessmentFindingsReturn
  readOnly: boolean
}

/**
 * Écran unique d'évaluation d'un contrôle (zone centrale) : verdict, pré-analyse IA
 * et constats. Le contexte et les preuves sont dans le rail (onglets Contexte / Preuves).
 */
export function ControlSinglePane({ assessment, observations, evidenceNotes, conformityLevel, onConformityChange, findingsHook, readOnly }: ControlSinglePaneProps) {
  // Réponses de cadrage liées à ce contrôle (question_controls -> questions -> réponses).
  // Réutilise le hook du rail ; affichées ici, au plus près de l'acte d'évaluation.
  const { cadrageAnswers } = useControlContext(assessment.mission_id, assessment.control_id)
  const { isReview, previous, setDelta } = useReviewBaseline(assessment.mission_id, assessment.control_id)

  return (
    <div className="p-6 space-y-5">
      {isReview && previous && (
        <ReviewPreviousPanel
          previous={previous}
          assessmentId={assessment.id}
          initialDelta={assessment.review_delta}
          hasCurrentFindings={findingsHook.findings.length > 0}
          readOnly={readOnly}
          onConformityChange={onConformityChange}
          copyFindings={findingsHook.bulkInsertFromAi}
          setDelta={setDelta}
        />
      )}

      <ControlVerdictCard
        conformityLevel={conformityLevel}
        findings={findingsHook.findings}
        readOnly={readOnly}
        onChange={onConformityChange}
      />

      {cadrageAnswers.length > 0 && <CadrageInline answers={cadrageAnswers} defaultOpen />}

      <AiPreAnalysisSection
        assessment={assessment}
        observations={observations}
        evidenceNotes={evidenceNotes}
        findingsHook={findingsHook}
        conformityLevel={conformityLevel}
        onConformityChange={onConformityChange}
        readOnly={readOnly}
      />

      <FindingsEditor
        findingsHook={findingsHook}
        readOnly={readOnly}
        checklistSuggestions={(assessment.control.audit_checklist ?? []).map((i) => i.label)}
        assessment={assessment}
      />
    </div>
  )
}
