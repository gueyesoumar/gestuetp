// Marque plateforme, resolue PAR INSTANCE via variable d'environnement.
//
// Defaut = 'Gëstu Comply' -> Comply ne change RIEN si l'env n'est pas posee.
// L'instance Regul pose le secret PLATFORM_BRAND_NAME='Gëstu Regul'
// (et, optionnel, PLATFORM_TAGLINE / RESEND_FROM_EMAIL).
//
// IMPORTANT : cette valeur sert A LA FOIS de nom affiche ET de reference du
// sentinel marque-blanche (isWhiteLabel = cabinetName !== platformBrand()).
// Toute comparaison marque-blanche doit donc utiliser platformBrand(), jamais
// une chaine 'Gëstu Comply' en dur.

export function platformBrand(): string {
  return Deno.env.get('PLATFORM_BRAND_NAME') ?? 'Gëstu Comply'
}

// Sous-titre court (le mot apres "Gëstu") pour l'en-tete du logo email.
export function platformBrandSuffix(): string {
  return platformBrand().replace(/^Gëstu\s*/i, '') || platformBrand()
}

// Tagline en pied d'email (caption autonome, sans article -> pas de souci de genre).
export function platformTagline(): string {
  return Deno.env.get('PLATFORM_TAGLINE') ?? "Plateforme d'audit et de conformité"
}
