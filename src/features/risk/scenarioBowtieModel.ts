import { splitBarrierEfficacies, riskResidualSplit, riskExposure, type RiskControlLinkKind } from '../../lib/constants'
import type { ScenarioRow } from './useRiskRegister'

export interface BowtieModel {
  /** Vraisemblance effective = inhérente + aggravation incidents (plafond 4). */
  effL: number
  inherentExp: number
  residual: number
  effPrev: number | null
  effCorr: number | null
  hasBarriers: boolean
}

type BarrierLike = { kind: RiskControlLinkKind; effectiveness: number }

/**
 * Modèle du nœud papillon (RFC 0017 Lot B) : calcul partagé inhérent -> résiduel
 * à partir des barrières (contrôles Comply + politiques). Source unique utilisée
 * par la bande de synthèse ET l'onglet Appréciation (pas de duplication).
 */
export function computeBowtieModel(
  scenario: Pick<ScenarioRow, 'inherent_likelihood' | 'inherent_impact'>,
  barriers: BarrierLike[],
  polBarriers: BarrierLike[],
  bump: number,
): BowtieModel {
  const effL = Math.min(4, scenario.inherent_likelihood + bump)
  const inherentExp = riskExposure(effL, scenario.inherent_impact)
  const { effPrev, effCorr } = splitBarrierEfficacies([...barriers, ...polBarriers])
  const hasBarriers = barriers.length + polBarriers.length > 0
  const residual = hasBarriers ? riskResidualSplit(effL, scenario.inherent_impact, effPrev, effCorr) : inherentExp
  return { effL, inherentExp, residual, effPrev, effCorr, hasBarriers }
}
