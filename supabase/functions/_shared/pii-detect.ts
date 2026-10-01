// Détection déterministe de données sensibles (P1 — sécurité IA).
// 100 % règles, aucun appel réseau, aucune valeur stockée (positions + catégories only).
// Localisé Sénégal (téléphone +221, NINEA, CNI/NIN). Exécuté côté Deno AVANT tout
// envoi à un modèle externe.

export type PiiGroup = 'pii' | 'financial' | 'secret'

export interface PiiMatch {
  category: string
  group: PiiGroup
  start: number
  end: number
}

// ── Validateurs ───────────────────────────────────────────────────────────────

/** Luhn : vrai si la séquence de chiffres est un numéro de carte plausible. */
function luhnValid(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0, dbl = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (d < 0 || d > 9) return false
    if (dbl) { d *= 2; if (d > 9) d -= 9 }
    sum += d; dbl = !dbl
  }
  return sum % 10 === 0
}

/** IBAN : contrôle mod-97 (ISO 7064) après réarrangement et conversion lettres→chiffres. */
function ibanValid(raw: string): boolean {
  const s = raw.replace(/\s/g, '').toUpperCase()
  if (s.length < 15 || s.length > 34) return false
  const rearranged = s.slice(4) + s.slice(0, 4)
  let remainder = 0
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0)
    const val = code >= 65 && code <= 90 ? (code - 55).toString() : ch
    for (const c of val) remainder = (remainder * 10 + (c.charCodeAt(0) - 48)) % 97
  }
  return remainder === 1
}

// ── Détecteurs ────────────────────────────────────────────────────────────────

interface Detector {
  category: string
  group: PiiGroup
  re: RegExp
  valid?: (m: string) => boolean
}

const DETECTORS: Detector[] = [
  { category: 'private_key', group: 'secret', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { category: 'api_key', group: 'secret', re: /\b(?:sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g },
  { category: 'secret_assignment', group: 'secret', re: /(?:password|mot de passe|mdp|pwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"']{6,}/gi },
  { category: 'iban', group: 'financial', re: /\b[A-Z]{2}\d{2}[\sA-Z0-9]{11,30}\b/g, valid: ibanValid },
  { category: 'card', group: 'financial', re: /\b(?:\d[ -]?){13,19}\b/g, valid: (m) => luhnValid(m.replace(/[ -]/g, '')) },
  { category: 'email', group: 'pii', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { category: 'phone_sn', group: 'pii', re: /(?:\+?221[\s.-]?)?(?:7[05678]|33)[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g },
  { category: 'ip', group: 'pii', re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { category: 'ninea', group: 'pii', re: /\bNINEA\s*[:n°º]*\s*\d{6,12}\b/gi },
  { category: 'cni_nin_sn', group: 'pii', re: /\b(?:CNI|NIN|carte nationale(?: d['’]identit[ée])?)\s*[:n°º]*\s*\d{12,14}\b/gi },
]

/**
 * Renvoie toutes les correspondances (catégorie + groupe + positions), triées, sans
 * chevauchement (la 1re correspondance l'emporte — détecteurs ordonnés du + spécifique).
 */
export function detectPii(text: string): PiiMatch[] {
  if (!text) return []
  const found: PiiMatch[] = []
  for (const d of DETECTORS) {
    d.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = d.re.exec(text)) !== null) {
      const value = m[0]
      if (d.valid && !d.valid(value)) continue
      found.push({ category: d.category, group: d.group, start: m.index, end: m.index + value.length })
    }
  }
  // Dédoublonnage par chevauchement : on garde la 1re (ordre = spécificité).
  found.sort((a, b) => a.start - b.start || b.end - a.end)
  const out: PiiMatch[] = []
  let lastEnd = -1
  for (const f of found) {
    if (f.start >= lastEnd) { out.push(f); lastEnd = f.end }
  }
  return out
}
