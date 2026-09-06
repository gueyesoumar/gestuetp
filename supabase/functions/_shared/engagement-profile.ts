// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Contexte de mission (RFC 0007 P1b) porté par l'arête `audit_engagement`
 * (cabinet → client). `engagement_profiles` en est la SOURCE DE VÉRITÉ depuis P1b.
 *
 * Renvoie `null` si l'arête ou le profil n'existe pas — l'appelant garde alors son
 * repli sur les colonnes de `cabinet_clients` (tant que P1c.1 Pass D ne les a pas
 * retirées). Usage typique (fusion, engagement_profiles gagne) :
 *
 *   let cc = ccArr?.[0] ?? null
 *   if (cc) { const ectx = await getEngagementContext(admin, cc.cabinet_id, cc.client_org_id)
 *             if (ectx) cc = { ...cc, ...ectx } }
 */
export interface EngagementContext {
  effectifs: string | null
  chiffre_affaires: string | null
  nombre_sites: number | null
  activites_principales: string | null
  structure_hierarchique: string | null
  parties_interessees: unknown
  exigences_reglementaires: unknown
  it_environment: string | null
  it_systems: string[]
  notes: string | null
}

export async function getEngagementContext(
  admin: SupabaseClient,
  cabinetId: string | null | undefined,
  clientOrgId: string | null | undefined,
): Promise<EngagementContext | null> {
  if (!cabinetId || !clientOrgId) return null
  const { data: edge } = await (admin
    .from('organization_relationships')
    .select('id')
    .eq('actor_org_id', cabinetId)
    .eq('target_org_id', clientOrgId)
    .eq('nature', 'audit_engagement')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle() as any)
  if (!edge?.id) return null
  const { data: prof } = await (admin
    .from('engagement_profiles')
    .select('effectifs, chiffre_affaires, nombre_sites, activites_principales, structure_hierarchique, parties_interessees, exigences_reglementaires, it_environment, it_systems, notes')
    .eq('engagement_id', edge.id)
    .maybeSingle() as any)
  return (prof as EngagementContext | null) ?? null
}
