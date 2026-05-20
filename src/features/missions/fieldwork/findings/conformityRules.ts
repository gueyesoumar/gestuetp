import type { AssessmentFinding } from '../../../../types/database.types'
import type { ConformityLevel } from '../../mission-constants'

/**
 * Regles de coherence findings <-> conformity_level.
 *
 * Matrice metier validee :
 *   findings present                       | suggere | autorise sans justif
 *   --------------------------------------+---------+----------------------
 *   >=1 NC majeure                         | nc      | nc, pc
 *   0 maj + >=1 NC mineure                 | pc      | pc, lc
 *   seulement observation / strength       | lc      | c, lc
 *   aucun finding                          | na      | na, c
 *
 * Politique : warning + justification ecrite obligatoire si l'auditeur
 * choisit un level non autorise (cf. submit-assessment).
 */

interface FindingCounts {
  major: number
  minor: number
  observation: number
  strength: number
}

function countByClassification(findings: AssessmentFinding[]): FindingCounts {
  return findings.reduce<FindingCounts>(
    (acc, f) => {
      if (f.classification === 'major_nc') acc.major++
      else if (f.classification === 'minor_nc') acc.minor++
      else if (f.classification === 'observation') acc.observation++
      else if (f.classification === 'strength') acc.strength++
      return acc
    },
    { major: 0, minor: 0, observation: 0, strength: 0 },
  )
}

/**
 * Renvoie le conformity_level suggere en fonction des findings.
 * Renvoie null si on ne peut rien suggerer (cas edge, ne devrait pas arriver).
 */
export function deriveSuggestedConformity(findings: AssessmentFinding[]): ConformityLevel | null {
  const c = countByClassification(findings)

  if (c.major > 0) return 'nc'
  if (c.minor > 0) return 'pc'
  if (c.observation > 0 || c.strength > 0) return 'lc'
  // Aucun finding : on suggere N/A par defaut (l'auditeur peut basculer sur 'c'
  // si le controle est explicitement conforme sans constat associe).
  return 'na'
}

/**
 * Verifie si le conformity_level choisi est coherent avec les findings,
 * selon la matrice metier ci-dessus.
 */
export function isConformityCoherent(
  level: ConformityLevel | null,
  findings: AssessmentFinding[],
): boolean {
  if (!level) return false
  const c = countByClassification(findings)

  if (c.major > 0) return level === 'nc' || level === 'pc'
  if (c.minor > 0) return level === 'pc' || level === 'lc'
  if (c.observation > 0 || c.strength > 0) return level === 'c' || level === 'lc'
  // Aucun finding
  return level === 'na' || level === 'c'
}

const CONFORMITY_LABELS: Record<ConformityLevel, string> = {
  c: 'Conforme',
  lc: 'Largement conforme',
  pc: 'Partiellement conforme',
  nc: 'Non conforme',
  na: 'Non applicable',
}

/**
 * Renvoie un message d'incoherence destine a l'UI (warning banner +
 * justification modal). Renvoie null si tout est coherent.
 */
export function getIncoherenceMessage(
  level: ConformityLevel | null,
  findings: AssessmentFinding[],
): string | null {
  if (isConformityCoherent(level, findings)) return null
  if (!level) return 'Selectionnez un niveau de conformite.'

  const c = countByClassification(findings)
  const suggested = deriveSuggestedConformity(findings)
  const suggestedLabel = suggested ? CONFORMITY_LABELS[suggested] : '—'
  const chosenLabel = CONFORMITY_LABELS[level]

  if (c.major > 0) {
    return `Vous avez choisi « ${chosenLabel} » mais ${c.major} non-conformite majeure${c.major > 1 ? 's' : ''} est presente. Niveau suggere : « ${suggestedLabel} ».`
  }
  if (c.minor > 0) {
    return `Vous avez choisi « ${chosenLabel} » mais ${c.minor} non-conformite mineure${c.minor > 1 ? 's' : ''} est presente. Niveau suggere : « ${suggestedLabel} ».`
  }
  if (c.observation > 0 || c.strength > 0) {
    return `Vous avez choisi « ${chosenLabel} » mais les findings ne contiennent que des observations / points forts. Niveau suggere : « ${suggestedLabel} ».`
  }
  return `Aucun finding enregistre, mais le niveau « ${chosenLabel} » a ete choisi. Niveau suggere : « ${suggestedLabel} ».`
}

/**
 * Renvoie la liste des findings NC majeures / mineures dont la recommandation
 * ou la priorite est manquante. Ces findings bloquent la soumission (variante B
 * validee : blocage dur, pas de warning).
 */
export function findIncompleteNcFindings(findings: AssessmentFinding[]): AssessmentFinding[] {
  return findings.filter((f) => {
    const isNc = f.classification === 'major_nc' || f.classification === 'minor_nc'
    if (!isNc) return false
    const missingReco = !f.recommendation || f.recommendation.trim().length === 0
    const missingPrio = !f.priority
    return missingReco || missingPrio
  })
}

export type ConformityCheckResult = {
  isCoherent: boolean
  incoherenceMessage: string | null
  suggested: ConformityLevel | null
  incompleteNcFindings: AssessmentFinding[]
}

/**
 * Verification globale a appeler au moment du submit.
 * Combine la verification de coherence et la verification de completude
 * des findings NC.
 */
export function checkConformity(
  level: ConformityLevel | null,
  findings: AssessmentFinding[],
): ConformityCheckResult {
  return {
    isCoherent: isConformityCoherent(level, findings),
    incoherenceMessage: getIncoherenceMessage(level, findings),
    suggested: deriveSuggestedConformity(findings),
    incompleteNcFindings: findIncompleteNcFindings(findings),
  }
}

/**
 * Helper d'affichage : label complet d'un ConformityLevel.
 */
export function getConformityLabel(level: ConformityLevel): string {
  return CONFORMITY_LABELS[level]
}

/**
 * Helper d'affichage : short code (C, LC, PC, NC, N/A).
 */
export function getConformityShort(level: ConformityLevel): string {
  const map: Record<ConformityLevel, string> = { c: 'C', lc: 'LC', pc: 'PC', nc: 'NC', na: 'N/A' }
  return map[level]
}
