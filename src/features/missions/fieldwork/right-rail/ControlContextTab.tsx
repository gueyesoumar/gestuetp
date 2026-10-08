import { ControlStatementCard } from '../ControlStatementCard'
import { CadrageInline } from './CadrageInline'
import { InterviewNotesInline } from './InterviewNotesInline'
import { useControlContext } from './useControlContext'
import { useInterviewNotesForControl } from './useInterviewNotesForControl'
import type { AssessmentWithControl } from '../../useAuditorAssessments'

interface ControlContextTabProps {
  assessment: AssessmentWithControl
  missionId: string
}

/**
 * Onglet Contexte du rail : énoncé du contrôle (description + guidance + risque),
 * réponses de cadrage liées et notes d'entretien. Déplacé depuis la zone centrale
 * pour alléger l'écran de saisie.
 */
export function ControlContextTab({ assessment, missionId }: ControlContextTabProps) {
  const ctx = useControlContext(missionId, assessment.control_id)
  const { snippets } = useInterviewNotesForControl(missionId, assessment.control.code)

  return (
    <div className="p-3 space-y-3">
      <ControlStatementCard
        description={assessment.control.description}
        guidance={assessment.control.guidance}
      />
      {ctx.cadrageAnswers.length > 0 && <CadrageInline answers={ctx.cadrageAnswers} />}
      {snippets.length > 0 && <InterviewNotesInline snippets={snippets} />}
      {ctx.cadrageAnswers.length === 0 && snippets.length === 0 && (
        <p className="text-[11px] text-gray-400 italic">Aucune réponse de cadrage ni note d&apos;entretien liée à ce contrôle.</p>
      )}
    </div>
  )
}
