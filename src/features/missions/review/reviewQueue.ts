import type { ReviewAssessment } from '../useReviewAssessments'

export type ReviewStage = 'lead_review' | 'associate_review'

/** Étape de revue de l'utilisateur sur cette mission, ou null s'il ne peut pas valider. */
export function resolveReviewStage(
  profileId: string | undefined,
  leadId: string | null | undefined,
  associateId: string | null | undefined,
): ReviewStage | null {
  if (profileId && profileId === associateId) return 'associate_review'
  if (profileId && profileId === leadId) return 'lead_review'
  return null
}

/** Une évaluation attend-elle une décision à l'étape de l'utilisateur ? */
export function isActionable(a: ReviewAssessment, stage: ReviewStage): boolean {
  return (
    (stage === 'lead_review' && a.status === 'submitted') ||
    (stage === 'associate_review' && a.status === 'in_review')
  )
}

export interface DomainGroup {
  code: string
  name: string
  items: ReviewAssessment[]
}

/** Regroupe les évaluations par domaine, triées par code de domaine. */
export function groupByDomain(assessments: ReviewAssessment[]): DomainGroup[] {
  const map = new Map<string, DomainGroup>()
  for (const a of assessments) {
    const code = a.control.domain.code
    let group = map.get(code)
    if (!group) {
      group = { code, name: a.control.domain.name, items: [] }
      map.set(code, group)
    }
    group.items.push(a)
  }
  return [...map.values()].sort((x, y) => x.code.localeCompare(y.code))
}
