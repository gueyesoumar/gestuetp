import { supabase } from '../../lib/supabase'
import { PromoteToRegisterModal } from './PromoteToRegisterModal'
import type { ScenarioFields } from './ScenarioFieldset'
import type { MissionRisk, RiskLevel, ScoreDimension } from '../../types/database.types'

// Cotation 4×4 de départ dérivée du niveau qualitatif du mission_risk (ajustable).
const LEVEL_TO_RATING: Record<RiskLevel, { l: number; i: number }> = {
  critical: { l: 4, i: 4 }, high: { l: 3, i: 3 }, medium: { l: 2, i: 2 }, low: { l: 1, i: 1 },
}

/** Promeut un risque de cadrage (mission_risk) vers le registre de l'organisation auditée. */
export function PromoteRiskModal({ risk, onClose, onDone }: { risk: MissionRisk; onClose: () => void; onDone: () => void }): JSX.Element {
  const rating = LEVEL_TO_RATING[risk.risk_level]
  const initial: ScenarioFields = {
    dimension: '', threat: '', feared: '', vulnerability: '', likelihood: rating.l, impact: rating.i,
  }

  const onSubmit = async (f: ScenarioFields): Promise<string | null> => {
    const { error } = await supabase.rpc('promote_mission_risk', {
      p_mission_risk_id: risk.id,
      p_dimension: f.dimension as ScoreDimension,
      p_likelihood: f.likelihood,
      p_impact: f.impact,
      p_vulnerability: f.vulnerability || null,
      p_threat_ref: f.threat || null,
      p_feared_event_ref: f.feared || null,
    })
    if (error) { console.error('[promote_mission_risk]', error.message); return error.message }
    return null
  }

  return (
    <PromoteToRegisterModal
      subject={{ title: risk.title, description: risk.description }}
      initial={initial}
      note="Complétez la dimension et ajustez la cotation."
      onSubmit={onSubmit}
      onClose={onClose}
      onDone={onDone}
    />
  )
}
