import { FindingsEditor } from './findings/FindingsEditor'
import { ControlVerdictCard } from './findings/ControlVerdictCard'
import { AiPreAnalysisSection } from './AiPreAnalysisSection'
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
  return (
    <div className="p-6 space-y-5">
      <ControlVerdictCard
        conformityLevel={conformityLevel}
        findings={findingsHook.findings}
        readOnly={readOnly}
        onChange={onConformityChange}
      />

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
