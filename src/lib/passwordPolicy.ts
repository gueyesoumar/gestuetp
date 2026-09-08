// Politique de mot de passe — modèle partagé + validation synchrone (UX).
// L'enforcement fait autorité côté serveur (edge `set-password`, qui ajoute la
// vérification HIBP). Ce module reflète les règles synchrones pour un feedback
// immédiat dans les formulaires. Garder aligné avec
// supabase/functions/_shared/password-policy.ts.

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

// Défauts alignés sur la ligne seed (migration 00225) — utilisés tant que la
// politique n'est pas chargée depuis la base.
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  min_length: 12,
  require_upper: true,
  require_lower: true,
  require_digit: true,
  require_symbol: false,
  min_unique: 4,
  forbid_common: true,
  check_hibp: true,
  rotation_days: null,
  history_count: 0,
}

// Liste courte de mots de passe notoirement faibles (complète le contrôle HIBP
// serveur). Volontairement minimale : la vraie couverture vient de HIBP.
const COMMON_PASSWORDS = new Set([
  'password', 'motdepasse', 'azerty', 'qwerty', 'azertyuiop', '123456', '1234567',
  '12345678', '123456789', '1234567890', 'admin', 'admin123', 'welcome', 'bienvenue',
  'iloveyou', 'letmein', 'changeme', 'passw0rd', 'p@ssw0rd', 'gestu', 'gestugroup',
])

const SYMBOL_RE = /[^A-Za-z0-9]/

/**
 * Renvoie la liste des règles NON satisfaites (messages FR prêts à afficher).
 * Tableau vide = mot de passe conforme aux règles synchrones.
 */
export function checkPasswordRules(password: string, policy: PasswordPolicy): string[] {
  const errors: string[] = []
  const pw = password ?? ''

  if (pw.length < policy.min_length) {
    errors.push(`Au moins ${policy.min_length} caractères`)
  }
  if (policy.require_upper && !/[A-Z]/.test(pw)) {
    errors.push('Au moins une majuscule')
  }
  if (policy.require_lower && !/[a-z]/.test(pw)) {
    errors.push('Au moins une minuscule')
  }
  if (policy.require_digit && !/[0-9]/.test(pw)) {
    errors.push('Au moins un chiffre')
  }
  if (policy.require_symbol && !SYMBOL_RE.test(pw)) {
    errors.push('Au moins un symbole')
  }
  if (policy.min_unique > 1 && new Set(pw).size < policy.min_unique) {
    errors.push(`Au moins ${policy.min_unique} caractères différents`)
  }
  if (policy.forbid_common && COMMON_PASSWORDS.has(pw.toLowerCase())) {
    errors.push('Mot de passe trop courant')
  }
  return errors
}

/** Description lisible des exigences (pour afficher sous le champ). */
export function describePasswordPolicy(policy: PasswordPolicy): string[] {
  const rules = [`${policy.min_length} caractères minimum`]
  if (policy.require_upper) rules.push('une majuscule')
  if (policy.require_lower) rules.push('une minuscule')
  if (policy.require_digit) rules.push('un chiffre')
  if (policy.require_symbol) rules.push('un symbole')
  if (policy.min_unique > 1) rules.push(`${policy.min_unique} caractères différents`)
  return rules
}
