// Jetons d'invitation / réinitialisation maison. Le BRUT (256 bits, base64url)
// vit uniquement dans le lien email ; on ne persiste que son sha256.

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Jeton aléatoire cryptographique (32 octets → base64url, URL-safe). */
export function newRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

/** sha256 hex du jeton brut (valeur stockée / recherchée). */
export async function hashSetupToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Lien brandé de définition de mot de passe. Le jeton est placé dans le FRAGMENT
 * (#) : il n'est PAS envoyé au serveur (pas dans les logs d'accès) ni via l'en-tête
 * Referer vers des sous-ressources tierces — lu uniquement côté client.
 * (base64url → URL-safe, pas d'encodage requis.)
 */
export function buildSetupLink(siteUrl: string, rawToken: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  return `${base}/set-password#setup_token=${rawToken}`
}

/**
 * Crée + persiste un jeton et renvoie le BRUT (à mettre dans le lien).
 * `ttlHours` : 24 pour une invitation, 1 pour un reset.
 */
// deno-lint-ignore no-explicit-any
export async function createSetupToken(
  admin: any,
  opts: { userId: string; purpose: 'invite' | 'reset'; ttlHours: number; createdBy?: string | null },
): Promise<{ raw: string } | { error: string }> {
  const raw = newRawToken()
  const hash = await hashSetupToken(raw)
  const expiresAt = new Date(Date.now() + opts.ttlHours * 3600 * 1000).toISOString()
  const { error } = await admin.from('password_setup_tokens').insert({
    user_id: opts.userId,
    token_hash: hash,
    purpose: opts.purpose,
    expires_at: expiresAt,
    created_by: opts.createdBy ?? null,
  })
  if (error) return { error: error.message }
  return { raw }
}
