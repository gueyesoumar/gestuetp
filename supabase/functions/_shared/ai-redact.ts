// Caviardage des données sensibles AVANT envoi au modèle externe (P2 — RFC 0012 §4.5).
// Pur, sans réseau. Remplace chaque span détecté par un jeton neutre : le contenu
// sensible ne quitte jamais l'edge, mais la structure du texte reste exploitable par l'IA.

import type { PiiMatch } from './pii-detect.ts'

// Jeton affiché à la place de chaque catégorie. Neutre, lisible par le modèle.
const TOKEN: Record<string, string> = {
  email: '[EMAIL]',
  phone_sn: '[TELEPHONE]',
  ip: '[IP]',
  ninea: '[NINEA]',
  cni_nin_sn: '[CNI]',
  iban: '[IBAN]',
  card: '[CARTE]',
  private_key: '[CLE_PRIVEE]',
  api_key: '[CLE_API]',
  secret_assignment: '[SECRET]',
}

function tokenFor(m: PiiMatch): string {
  const byCategory = TOKEN[m.category]
  if (byCategory) return byCategory
  if (m.group === 'secret') return '[SECRET]'
  if (m.group === 'financial') return '[DONNEE_FINANCIERE]'
  return '[DONNEE_PERSONNELLE]'
}

export interface RedactResult {
  text: string
  redactedCount: number
}

/**
 * Remplace les spans détectés par des jetons. `matches` doit provenir de detectPii
 * (déjà triés et sans chevauchement). Robuste à un chevauchement résiduel (ignoré).
 */
export function redactText(text: string, matches: PiiMatch[]): RedactResult {
  if (!text || matches.length === 0) return { text, redactedCount: 0 }
  const sorted = [...matches].sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = 0
  let count = 0
  for (const m of sorted) {
    if (m.start < cursor) continue // sécurité : span chevauchant déjà couvert
    out += text.slice(cursor, m.start) + tokenFor(m)
    cursor = m.end
    count++
  }
  out += text.slice(cursor)
  return { text: out, redactedCount: count }
}
