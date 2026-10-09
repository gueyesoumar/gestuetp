import type { Mission } from '../../types/database.types'

/**
 * Mission réflexive : l'organisation s'audite elle-même (client = cabinet).
 * Cas édition Entreprise ou campagne d'auto-évaluation d'un cabinet — aucun tiers
 * audité, donc aucun portail ni relance « client » n'a de sens (RFC 0013 F5).
 */
export function isReflexiveMission(mission: Pick<Mission, 'client_id' | 'cabinet_id'>): boolean {
  return mission.client_id === mission.cabinet_id
}

/**
 * La mission expose-t-elle un portail côté partie auditée ?
 * Faux si l'org n'a pas la capacité `client_portal` (édition Entreprise) ou si la
 * mission est réflexive. Toute affordance portail/relance doit passer par ce garde.
 */
export function missionHasClientPortal(
  mission: Pick<Mission, 'client_id' | 'cabinet_id'>,
  hasCapability: (cap: 'client_portal') => boolean,
): boolean {
  return hasCapability('client_portal') && !isReflexiveMission(mission)
}
