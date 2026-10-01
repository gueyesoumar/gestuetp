// Score d'exposition IA (P1) — agrège la détection déterministe en un indicateur
// lisible (0-100 + niveau) de ce qu'un envoi au modèle exposerait. Observe-only :
// ne bloque rien (le blocage/caviardage = P2).

import { detectPii, type PiiGroup } from './pii-detect.ts'

export type SensitivityLevel = 'faible' | 'moyenne' | 'elevee'

export interface ExposureScore {
  score: number // 0-100
  level: SensitivityLevel
  counts: Record<PiiGroup, number>
  pct_flagged: number // part des caractères couverts par une détection (0-100)
  total_chars: number
}

// Pondérations : un secret domine, le financier pèse lourd, la PII s'accumule.
const WEIGHT: Record<PiiGroup, number> = { secret: 40, financial: 10, pii: 3 }

/**
 * Calcule le score d'exposition sur un ou plusieurs fragments de texte (identité
 * client, réponses de questionnaire, observations, texte de document extrait…).
 */
export function computeExposure(texts: Array<string | null | undefined>): ExposureScore {
  const joined = texts.filter(Boolean).join('\n')
  const matches = detectPii(joined)
  const counts: Record<PiiGroup, number> = { pii: 0, financial: 0, secret: 0 }
  let flaggedChars = 0
  for (const m of matches) {
    counts[m.group]++
    flaggedChars += m.end - m.start
  }
  const total = joined.length
  const raw = counts.secret * WEIGHT.secret + counts.financial * WEIGHT.financial + counts.pii * WEIGHT.pii
  const score = Math.min(100, raw)
  const level: SensitivityLevel =
    counts.secret > 0 || score >= 60 ? 'elevee' : score >= 25 ? 'moyenne' : 'faible'
  const pct_flagged = total > 0 ? Math.round((flaggedChars / total) * 1000) / 10 : 0
  return { score, level, counts, pct_flagged, total_chars: total }
}
