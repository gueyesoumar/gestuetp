import { supabase } from '../../lib/supabase'
import { PromoteToRegisterModal } from './PromoteToRegisterModal'
import type { ScenarioFields } from './ScenarioFieldset'
import type { AssessmentFinding, FindingPriority, ScoreDimension } from '../../types/database.types'

const PRIORITY_TO_RATING: Record<FindingPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 }

// Cotation de départ : priorité si présente, sinon gravité de la classification.
function findingRating(f: AssessmentFinding): number {
  if (f.priority) return PRIORITY_TO_RATING[f.priority]
  return f.classification === 'major_nc' ? 3 : f.classification === 'minor_nc' ? 2 : 1
}

/** Promeut un constat (assessment_finding) vers le registre de l'organisation auditée. */
export function PromoteFindingModal({ finding, onClose, onDone }: { finding: AssessmentFinding; onClose: () => void; onDone: () => void }): JSX.Element {
  const base = findingRating(finding)
  const initial: ScenarioFields = {
    dimension: '', threat: '', feared: '', vulnerability: '', likelihood: base, impact: base,
  }

  const onSubmit = async (f: ScenarioFields): Promise<string | null> => {
    const { error } = await supabase.rpc('promote_finding', {
      p_finding_id: finding.id,
      p_dimension: (f.dimension || null) as ScoreDimension | null,
      p_likelihood: f.likelihood,
      p_impact: f.impact,
      p_vulnerability: f.vulnerability || null,
      p_threat_ref: f.threat || null,
      p_feared_event_ref: f.feared || null,
    })
    if (error) { console.error('[promote_finding]', error.message); return error.message }
    return null
  }

  return (
    <PromoteToRegisterModal
      subject={{ title: finding.description || 'Constat', description: finding.risk }}
      initial={initial}
      dimensionOptional
      note="Dimension auto-déduite du contrôle si laissée vide ; ajustez la cotation au besoin."
      onSubmit={onSubmit}
      onClose={onClose}
      onDone={onDone}
    />
  )
}
