// Construction du lien de définition de mot de passe, brandé sur le domaine du
// cabinet (ou le domaine plateforme), SANS exposer le host `<projet>.supabase.co`.
//
// Au lieu d'envoyer le `action_link` brut de `generateLink` (qui pointe sur
// `<projet>.supabase.co/auth/v1/verify?...`), on met le `hashed_token` (aussi
// renvoyé par `generateLink`) dans NOTRE propre URL. La page /set-password
// échange ce token via `supabase.auth.verifyOtp({ token_hash, type })` — c'est
// le mécanisme supporté par Supabase pour les liens de confirmation custom.
//
// `type` est toujours 'recovery' : tous nos flux (invitation owner/membre,
// reset) génèrent le lien avec `generateLink({ type: 'recovery' })`.

export function buildSetPasswordLink(siteUrl: string, hashedToken: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  return `${base}/set-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
}

// Extrait le hashed_token de la réponse de `admin.auth.admin.generateLink`.
// deno-lint-ignore no-explicit-any
export function extractHashedToken(linkData: any): string | null {
  return (linkData as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token ?? null
}
