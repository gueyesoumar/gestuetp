// Politique de mot de passe — validation serveur (fait autorité).
// Miroir des règles synchrones de src/lib/passwordPolicy.ts + vérification HIBP
// (Have I Been Pwned) par k-anonymity + historique de non-réutilisation (bcrypt).
// Utilisé par les edges `set-password` et `reset-user-password`.
import bcrypt from 'npm:bcryptjs@2.4.3'

export interface PasswordPolicy {
  min_length: number
  require_upper: boolean
  require_lower: boolean
  require_digit: boolean
  require_symbol: boolean
  min_unique: number
  forbid_common: boolean
  check_hibp: boolean
  rotation_days: number | null
  history_count: number
}

const COMMON_PASSWORDS = new Set([
  'password', 'motdepasse', 'azerty', 'qwerty', 'azertyuiop', '123456', '1234567',
  '12345678', '123456789', '1234567890', 'admin', 'admin123', 'welcome', 'bienvenue',
  'iloveyou', 'letmein', 'changeme', 'passw0rd', 'p@ssw0rd', 'gestu', 'gestugroup',
])

const SYMBOL_RE = /[^A-Za-z0-9]/

/** Règles synchrones — renvoie les messages FR des règles non satisfaites. */
export function checkPasswordRules(password: string, policy: PasswordPolicy): string[] {
  const errors: string[] = []
  const pw = password ?? ''

  if (pw.length < policy.min_length) errors.push(`Au moins ${policy.min_length} caractères`)
  if (policy.require_upper && !/[A-Z]/.test(pw)) errors.push('Au moins une majuscule')
  if (policy.require_lower && !/[a-z]/.test(pw)) errors.push('Au moins une minuscule')
  if (policy.require_digit && !/[0-9]/.test(pw)) errors.push('Au moins un chiffre')
  if (policy.require_symbol && !SYMBOL_RE.test(pw)) errors.push('Au moins un symbole')
  if (policy.min_unique > 1 && new Set(pw).size < policy.min_unique) {
    errors.push(`Au moins ${policy.min_unique} caractères différents`)
  }
  if (policy.forbid_common && COMMON_PASSWORDS.has(pw.toLowerCase())) {
    errors.push('Mot de passe trop courant')
  }
  return errors
}

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Vérifie via HIBP (k-anonymity) si le mot de passe apparaît dans une fuite connue.
 * On n'envoie JAMAIS le mot de passe ni son hash complet — seulement les 5 premiers
 * caractères du SHA-1. En cas d'indisponibilité du service, on n'échoue pas la
 * validation (fail-open : les autres règles s'appliquent déjà).
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return false
    const body = await res.text()
    for (const line of body.split('\n')) {
      const [suf, countStr] = line.trim().split(':')
      if (suf === suffix && Number(countStr) > 0) return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Validation complète (règles + HIBP si activé). Renvoie la liste des messages
 * d'erreur ; tableau vide = conforme.
 */
export async function validatePassword(password: string, policy: PasswordPolicy): Promise<string[]> {
  const errors = checkPasswordRules(password, policy)
  if (policy.check_hibp && await isPwnedPassword(password)) {
    errors.push('Ce mot de passe figure dans une fuite de données connue')
  }
  return errors
}

// --- Historique de non-réutilisation (bcrypt) ---

/** Hash bcrypt (coût 10) du mot de passe, pour stockage en historique. */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

/** True si le mot de passe correspond à l'un des hashes d'historique fournis. */
export async function isPasswordReused(password: string, hashes: string[]): Promise<boolean> {
  for (const h of hashes) {
    if (await bcrypt.compare(password, h)) return true
  }
  return false
}
