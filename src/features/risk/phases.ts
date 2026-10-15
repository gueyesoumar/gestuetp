/**
 * Triptyque ISO 27005 « Apprécier -> Traiter -> Surveiller » : source UNIQUE des
 * phases du module Risk (RFC 0017 Lot A, ossature). Réutilisé par la nav latérale,
 * le tableau de bord et (Lot B) le détail scénario pour garantir des libellés,
 * un ordre et des accents cohérents partout.
 */
export type RiskPhaseKey = 'apprecier' | 'traiter' | 'surveiller'

export interface RiskPhase {
  key: RiskPhaseKey
  /** Rang dans la séquence du processus (vraie séquence, pas une décoration). */
  index: number
  label: string
  /** Légende courte affichée sous le libellé (eyebrow du dashboard). */
  caption: string
  /** Accent on-brand pour la pastille de phase. */
  accent: string
}

export const RISK_PHASES: readonly RiskPhase[] = [
  { key: 'apprecier', index: 1, label: 'Apprécier', caption: 'Identifier, analyser et évaluer le risque', accent: '#2D6A4F' },
  { key: 'traiter', index: 2, label: 'Traiter', caption: 'Décider, planifier et accepter', accent: '#E07A5F' },
  { key: 'surveiller', index: 3, label: 'Surveiller', caption: 'Revoir, historiser et alerter', accent: '#B8860B' },
] as const

export const RISK_PHASE_BY_KEY: Record<RiskPhaseKey, RiskPhase> =
  Object.fromEntries(RISK_PHASES.map((p) => [p.key, p])) as Record<RiskPhaseKey, RiskPhase>
