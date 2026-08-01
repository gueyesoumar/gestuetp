import type { ControlAssessment } from '../../../types/database.types'

export type DisplayStatus = 'not_started' | 'in_progress' | 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected'

// Returns the visual status to show in the sidebar / badges.
// - 'not_started' : no assessment row at all (control assigned but never opened)
// - 'in_progress' : draft with content (auditor has started typing)
// - 'draft' : draft empty (assigned, opened, but nothing saved yet)
// - others : raw DB status
export function computeDisplayStatus(assessment: Pick<ControlAssessment, 'status' | 'observations' | 'evidence_notes'> | null | undefined): DisplayStatus {
  if (!assessment) return 'not_started'
  if (assessment.status !== 'draft') return assessment.status
  const hasContent = (assessment.observations && assessment.observations.trim().length > 0)
    || (assessment.evidence_notes && assessment.evidence_notes.trim().length > 0)
  return hasContent ? 'in_progress' : 'draft'
}
