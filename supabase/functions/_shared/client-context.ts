// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { getEngagementContext } from './engagement-profile.ts'

/**
 * Contexte client complet pour les fonctions IA (RFC 0007) : IDENTITÉ depuis le nœud
 * `organizations` (P1c.2, source de vérité, remappée vers les noms historiques
 * `client_*`) + CONTEXTE de mission depuis `engagement_profiles` (P1b, via l'arête).
 * Renvoie null si l'organisation cliente est introuvable.
 */
export async function getClientContext(
  admin: SupabaseClient,
  cabinetId: string | null | undefined,
  clientOrgId: string | null | undefined,
): Promise<Record<string, unknown> | null> {
  if (!clientOrgId) return null
  const { data: org } = await (admin
    .from('organizations')
    .select('name, sector, country, registration_number, city, address, website, phone, logo_url')
    .eq('id', clientOrgId)
    .maybeSingle() as any)
  if (!org) return null
  const identity = {
    client_name: org.name,
    client_sector: org.sector,
    client_country: org.country,
    client_registration_number: org.registration_number,
    client_city: org.city,
    client_address: org.address,
    client_website: org.website,
    client_phone: org.phone,
    logo_url: org.logo_url,
  }
  const ctx = (await getEngagementContext(admin, cabinetId, clientOrgId)) ?? {}
  return { ...identity, ...ctx }
}
