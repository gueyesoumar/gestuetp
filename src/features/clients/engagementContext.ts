import { supabase } from '../../lib/supabase'
import type { CabinetClient } from '../../types/database.types'

/**
 * Contexte de mission (RFC 0007 P1b) porté par l'arête `audit_engagement`
 * (cabinet → client). `engagement_profiles` en est la SOURCE DE VÉRITÉ ; on le
 * fusionne dans la forme `CabinetClient` au niveau de l'accès aux données, de sorte
 * que l'UML en aval (liste, détail, cadrage) reste inchangée. Repli implicite : si
 * l'arête/profil n'existe pas, la Map ne contient pas la clé → l'appelant garde la
 * fiche telle quelle.
 */
export type EngagementContext = Partial<Pick<CabinetClient,
  | 'effectifs' | 'chiffre_affaires' | 'nombre_sites' | 'activites_principales'
  | 'structure_hierarchique' | 'parties_interessees' | 'exigences_reglementaires'
  | 'it_environment' | 'it_systems' | 'notes'>>

const CONTEXT_COLS =
  'effectifs, chiffre_affaires, nombre_sites, activites_principales, structure_hierarchique, parties_interessees, exigences_reglementaires, it_environment, it_systems, notes'

/** Contexte par organisation cliente, pour un cabinet donné (1 requête arêtes + 1 requête profils). */
export async function fetchEngagementContextMap(
  cabinetId: string | null | undefined,
  clientOrgIds: (string | null | undefined)[],
  signal?: AbortSignal,
): Promise<Map<string, EngagementContext>> {
  const map = new Map<string, EngagementContext>()
  const ids = [...new Set(clientOrgIds.filter((v): v is string => !!v))]
  if (!cabinetId || ids.length === 0) return map

  const edgeQuery = supabase
    .from('organization_relationships')
    .select('id, target_org_id')
    .eq('actor_org_id', cabinetId)
    .eq('nature', 'audit_engagement')
    .eq('status', 'active')
    .in('target_org_id', ids)
  const { data: edges, error: edgeErr } = await (signal ? edgeQuery.abortSignal(signal) : edgeQuery)
  if (edgeErr || !edges || edges.length === 0) return map

  const edgeToClient = new Map((edges as { id: string; target_org_id: string }[]).map((e) => [e.id, e.target_org_id]))
  const profQuery = supabase
    .from('engagement_profiles')
    .select(`engagement_id, ${CONTEXT_COLS}`)
    .in('engagement_id', [...edgeToClient.keys()])
  const { data: profs, error: profErr } = await (signal ? profQuery.abortSignal(signal) : profQuery)
  if (profErr || !profs) return map

  for (const row of profs as (EngagementContext & { engagement_id: string })[]) {
    const clientOrgId = edgeToClient.get(row.engagement_id)
    // row porte une clé engagement_id en trop (ignorée par les consommateurs CabinetClient).
    if (clientOrgId) map.set(clientOrgId, row)
  }
  return map
}

/** Contexte d'engagement pour une seule paire (cabinet, client). null si absent. */
export async function fetchEngagementContext(
  cabinetId: string | null | undefined,
  clientOrgId: string | null | undefined,
  signal?: AbortSignal,
): Promise<EngagementContext | null> {
  if (!cabinetId || !clientOrgId) return null
  const map = await fetchEngagementContextMap(cabinetId, [clientOrgId], signal)
  return map.get(clientOrgId) ?? null
}
