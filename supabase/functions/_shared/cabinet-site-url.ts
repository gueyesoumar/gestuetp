/**
 * Résout l'URL de base d'onboarding pour un cabinet : son domaine marque blanche
 * vérifié si la marque blanche est active, sinon le domaine générique.
 *
 * Utilisé par les edges qui envoient des liens set-password / recovery à des
 * comptes rattachés à un cabinet, pour que l'utilisateur atterrisse sur SON
 * portail brandé (et non sur app.gestugroup.com).
 *
 * N'utilise le domaine cabinet que si le flag white_label_branding est actif ET
 * qu'un domaine cabinet_domains est vérifié — sinon le middleware redirigerait
 * ce domaine vers app.gestugroup.com. Toute erreur retombe sur le fallback.
 */

// deno-lint-ignore no-explicit-any
export async function resolveCabinetSiteUrl(admin: any, organizationId: string): Promise<string> {
  const fallback = Deno.env.get('SITE_URL') ?? 'https://app.gestugroup.com'
  if (!organizationId) return fallback
  try {
    const { data: flag } = await admin
      .from('feature_flags')
      .select('id, is_globally_enabled')
      .eq('slug', 'white_label_branding')
      .maybeSingle()
    if (!flag) return fallback
    const f = flag as { id: string; is_globally_enabled: boolean }

    const { data: override } = await admin
      .from('feature_flag_overrides')
      .select('enabled')
      .eq('flag_id', f.id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    const enabled = override ? (override as { enabled: boolean }).enabled : f.is_globally_enabled
    if (!enabled) return fallback

    const { data: dom } = await admin
      .from('cabinet_domains')
      .select('hostname')
      .eq('cabinet_id', organizationId)
      .eq('is_verified', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const hostname = (dom as { hostname: string } | null)?.hostname
    if (hostname) return `https://${hostname}`
  } catch (err) {
    console.warn('[cabinet-site-url] résolution impossible:', err instanceof Error ? err.message : err)
  }
  return fallback
}
