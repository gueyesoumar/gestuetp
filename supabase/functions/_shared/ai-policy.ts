// Résolveur de politique d'exposition IA (P2 — RFC 0012 §4.4, Décisions A & C).
// Data-driven, pur. Décide ce qu'on fait d'un contenu selon sa sensibilité et le
// consentement client. Ne dépend d'aucune I/O.

import type { SensitivityLevel } from './exposure-score.ts'

export type PolicyAction = 'allow' | 'redact' | 'consent_required' | 'blocked'

export interface PolicyInput {
  level: SensitivityLevel
  hasSecret: boolean
  hasConsent: boolean
}

/**
 * Politique standard (Décision C) :
 *   secret détecté → bloquer (toujours, quel que soit le consentement / la destination)
 *   faible         → autoriser
 *   moyenne        → caviarder (on envoie une version expurgée, sans consentement requis)
 *   élevée         → demander accord : autorisé SI consentement client, sinon bloqué (Décision A)
 */
export function resolvePolicy({ level, hasSecret, hasConsent }: PolicyInput): PolicyAction {
  if (hasSecret) return 'blocked'
  if (level === 'faible') return 'allow'
  if (level === 'moyenne') return 'redact'
  // level === 'elevee'
  return hasConsent ? 'allow' : 'consent_required'
}
