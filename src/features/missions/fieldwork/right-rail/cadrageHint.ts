import type { CadrageAnswer } from './useControlContext'

/** Normalise une réponse pour comparer attendu vs obtenu (booléens, oui/non, texte). */
export function normalizeAnswer(v: unknown): string {
  return normalize(v)
}
function normalize(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  let s = String(v ?? '').trim().toLowerCase()
  if (s === 'true' || s === 'yes') s = 'oui'
  if (s === 'false' || s === 'no') s = 'non'
  return s
}

/** Vrai si la réponse diffère de l'attendu (polarité définie des deux côtés). */
export function isUnfavorablePair(expected: string | null, value: unknown): boolean {
  if (!expected) return false
  const e = normalize(expected)
  const g = normalize(value)
  return Boolean(e) && Boolean(g) && g !== e
}

/** Vrai si la réponse du client diffère de la réponse attendue (polarité définie). */
export function isUnfavorable(a: CadrageAnswer): boolean {
  return isUnfavorablePair(a.expected_answer, a.response_value)
}

export interface CadrageHint { unfavorable: number; worstWeight: number }

/**
 * Pré-suggestion de verdict (levier étage 2) : détecte les réponses de cadrage
 * DÉFAVORABLES (différentes de la réponse attendue) sur un contrôle. Ne considère
 * que les questions dont la polarité (expected_answer) est définie ; renvoie null
 * si rien de défavorable → pas de pré-suggestion.
 */
export function getCadrageHint(answers: CadrageAnswer[]): CadrageHint | null {
  let unfavorable = 0
  let worstWeight = 0
  for (const a of answers) {
    if (isUnfavorable(a)) {
      unfavorable++
      worstWeight = Math.max(worstWeight, a.weight)
    }
  }
  return unfavorable > 0 ? { unfavorable, worstWeight } : null
}
