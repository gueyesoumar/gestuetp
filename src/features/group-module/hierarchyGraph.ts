import { supabase } from '../../lib/supabase'

/**
 * Hiérarchie d'organisations lue depuis le GRAPHE (RFC 0007 P4b) : arêtes
 * `group_ownership` / `regulatory_supervision` actives, en remplacement de la
 * colonne `parent_org_id` (supprimée en 00224). Le parent = l'acteur de l'arête
 * entrante ; les enfants directs = les cibles des arêtes sortantes.
 */
const HIER = "nature.in.(group_ownership,regulatory_supervision)"

/** Ids des enfants DIRECTS d'une org (cibles de ses arêtes de hiérarchie sortantes). */
export async function fetchDirectChildOrgIds(parentOrgId: string | null | undefined, signal?: AbortSignal): Promise<string[]> {
  if (!parentOrgId) return []
  const q = supabase.from('organization_relationships').select('target_org_id')
    .eq('actor_org_id', parentOrgId).eq('status', 'active').or(HIER)
  const { data } = await (signal ? q.abortSignal(signal) : q)
  return (data ?? []).map((r) => (r as { target_org_id: string }).target_org_id)
}

/** Org parente d'une org (acteur de son arête de hiérarchie entrante), ou null. */
export async function fetchParentOrgId(orgId: string | null | undefined, signal?: AbortSignal): Promise<string | null> {
  if (!orgId) return null
  const q = supabase.from('organization_relationships').select('actor_org_id')
    .eq('target_org_id', orgId).eq('status', 'active').or(HIER).limit(1)
  const { data } = await (signal ? q.abortSignal(signal) : q)
  return (data && data.length > 0) ? (data[0] as { actor_org_id: string }).actor_org_id : null
}

/** Carte enfant→parent pour une liste d'orgs (1 requête). */
export async function fetchParentMap(childOrgIds: string[], signal?: AbortSignal): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const ids = [...new Set(childOrgIds.filter(Boolean))]
  if (ids.length === 0) return map
  const q = supabase.from('organization_relationships').select('actor_org_id, target_org_id')
    .in('target_org_id', ids).eq('status', 'active').or(HIER)
  const { data } = await (signal ? q.abortSignal(signal) : q)
  for (const r of data ?? []) {
    const row = r as { actor_org_id: string; target_org_id: string }
    if (!map.has(row.target_org_id)) map.set(row.target_org_id, row.actor_org_id)
  }
  return map
}
