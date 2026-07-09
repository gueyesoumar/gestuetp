// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

/**
 * manage-entity — gestion des entités internes d'un groupe (Axe 1).
 *
 * Actions : list | create | update | deactivate | reactivate
 *
 * Sécurité (CLAUDE.md §3) :
 *  - JWT vérifié (authenticateCaller) ; création/modif d'organisation = opération
 *    sensible -> service_role uniquement, jamais d'INSERT client direct.
 *  - L'appelant doit appartenir à une organisation de type "group".
 *  - Permission can_manage_subsidiaries requise pour muter (list exige au moins
 *    can_view_entity_detail). La sémantique "premier setup" de l'UI
 *    (useGroupPermissions) est répliquée : si AUCUNE permission groupe n'est
 *    configurée sur les rôles de l'appelant, on autorise (fail-open de setup),
 *    is_platform_owner passe toujours.
 *  - Cloisonnement : parent_org_id (create) et entité cible (update/deactivate/
 *    reactivate) doivent appartenir au sous-arbre du groupe de l'appelant.
 */

const ENTITY_TYPES = ['filiale', 'site', 'direction', 'business_unit'] as const
type EntityType = typeof ENTITY_TYPES[number]

interface Payload {
  action: 'list' | 'create' | 'update' | 'deactivate' | 'reactivate'
  entity_id?: string
  name?: string
  entity_type?: EntityType
  parent_org_id?: string
  sector?: string | null
  city?: string | null
  country?: string | null
  include_inactive?: boolean
  // Profil réglementaire (Gëstu Regul / M1) — optionnel, ignoré côté Comply.
  criticality?: 'eleve' | 'standard' | 'indetermine'
  obligation_regime?: string | null
  tier?: string | null
  reg_status?: 'active' | 'exited'
  entry_date?: string | null
  exit_date?: string | null
}

const CRITICALITY = ['eleve', 'standard', 'indetermine']
const REG_STATUS = ['active', 'exited']

/** Construit le patch de profil réglementaire à partir du payload (null si aucun champ). */
function profilePatch(body: Payload): Record<string, unknown> | null {
  const p: Record<string, unknown> = {}
  if (body.criticality !== undefined) p.criticality = body.criticality
  if (body.obligation_regime !== undefined) p.obligation_regime = body.obligation_regime
  if (body.tier !== undefined) p.tier = body.tier
  if (body.reg_status !== undefined) p.status = body.reg_status
  if (body.entry_date !== undefined) p.entry_date = body.entry_date
  if (body.exit_date !== undefined) p.exit_date = body.exit_date
  return Object.keys(p).length ? p : null
}

const GROUP_PERM_KEYS = [
  'can_view_supervision',
  'can_create_campaign',
  'can_manage_subsidiaries',
  'can_view_entity_detail',
]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const suffix = crypto.randomUUID().slice(0, 8)
  return `${base || 'entite'}-${suffix}`
}

/** Réplique la logique de useGroupPermissions : owner OU perm explicite OU
 *  aucune permission groupe configurée (premier setup). Fail-closed sinon. */
async function canManageEntities(admin: any, userId: string): Promise<boolean> {
  if (await hasCabinetPerm(admin, userId, 'can_manage_subsidiaries')) return true
  const { data } = await admin
    .from('user_platform_roles')
    .select('platform_roles(permissions)')
    .eq('user_id', userId)
  const rows = (data ?? []) as Array<{ platform_roles: { permissions: Record<string, unknown> } | null }>
  const anyGroupPerm = rows.some((r) => {
    const p = r.platform_roles?.permissions
    return !!p && GROUP_PERM_KEYS.some((k) => k in p)
  })
  return !anyGroupPerm
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile

    if (caller.role === 'client') return json({ error: 'Accès refusé' }, 403)

    // L'org de l'appelant doit être un groupe.
    const { data: callerOrg } = await admin
      .from('organizations')
      .select('id, types')
      .eq('id', caller.organization_id)
      .single()
    const isGroup = Array.isArray(callerOrg?.types) && callerOrg!.types.includes('group')
    if (!isGroup) return json({ error: "Votre organisation n'est pas un groupe" }, 403)
    const groupId = caller.organization_id

    const body = (await req.json()) as Payload
    const action = body.action

    // Sous-arbre complet (incl. désactivées) du groupe de l'appelant.
    const { data: descRows } = await admin.rpc('get_entity_descendants', { parent_id: groupId })
    const descendantIds = new Set<string>(((descRows ?? []) as Array<{ get_entity_descendants: string } | string>)
      .map((r) => (typeof r === 'string' ? r : (r as any).get_entity_descendants ?? (r as any).id)))

    // ---- LIST ----------------------------------------------------------------
    if (action === 'list') {
      const ids = Array.from(descendantIds)
      if (ids.length === 0) return json({ entities: [] })
      const { data: orgs, error } = await admin
        .from('organizations')
        .select('id, name, entity_type, parent_org_id, sector, city, country, is_active')
        .in('id', ids)
        .order('name')
      if (error) {
        console.error('[manage-entity] list:', error.message)
        return json({ error: 'Erreur de chargement' }, 500)
      }
      // Profils réglementaires (Regul) — vide côté Comply.
      const { data: profs } = await admin
        .from('entity_regulatory_profile')
        .select('organization_id, criticality, obligation_regime, tier, status, entry_date, exit_date')
        .in('organization_id', ids)
      const pmap = new Map((profs ?? []).map((p: any) => [p.organization_id, p]))
      const entities = (orgs ?? []).map((o: any) => ({ ...o, regulatory_profile: pmap.get(o.id) ?? null }))
      return json({ entities })
    }

    // Toute mutation exige la permission de gestion.
    if (!(await canManageEntities(admin, caller.id))) {
      return json({ error: 'Permission de gestion des entités requise' }, 403)
    }

    // ---- CREATE --------------------------------------------------------------
    if (action === 'create') {
      const name = (body.name ?? '').trim()
      if (!name) return json({ error: 'Le nom est requis' }, 400)
      if (!body.entity_type || !ENTITY_TYPES.includes(body.entity_type)) {
        return json({ error: "Type d'entité invalide" }, 400)
      }
      if (body.criticality !== undefined && !CRITICALITY.includes(body.criticality)) {
        return json({ error: 'Criticité invalide' }, 400)
      }
      if (body.reg_status !== undefined && !REG_STATUS.includes(body.reg_status)) {
        return json({ error: 'Statut invalide' }, 400)
      }
      const parentId = body.parent_org_id ?? groupId
      // Le parent doit être le groupe lui-même ou une entité du sous-arbre.
      if (parentId !== groupId && !descendantIds.has(parentId)) {
        return json({ error: "Parent hors de votre périmètre" }, 403)
      }
      const { data: created, error } = await admin
        .from('organizations')
        .insert({
          name,
          slug: slugify(name),
          types: [],
          entity_type: body.entity_type,
          parent_org_id: parentId,
          sector: body.sector ?? null,
          city: body.city ?? null,
          country: body.country ?? null,
          is_active: true,
        })
        .select('id, name, entity_type, parent_org_id, sector, city, country, is_active')
        .single()
      if (error) {
        console.error('[manage-entity] create:', error.message)
        return json({ error: "Impossible de créer l'entité" }, 500)
      }
      // Profil réglementaire (Regul) — best-effort, non bloquant pour la création.
      const prof = profilePatch(body)
      if (prof) {
        const { error: perr } = await admin
          .from('entity_regulatory_profile')
          .insert({ organization_id: created.id, ...prof })
        if (perr) console.error('[manage-entity] create profile:', perr.message)
      }
      return json({ entity: created }, 201)
    }

    // Les actions suivantes ciblent une entité existante DU SOUS-ARBRE.
    const entityId = body.entity_id
    if (!entityId) return json({ error: 'entity_id requis' }, 400)
    if (!descendantIds.has(entityId)) {
      return json({ error: "Cette entité n'appartient pas à votre groupe" }, 403)
    }

    // ---- UPDATE --------------------------------------------------------------
    if (action === 'update') {
      const patch: Record<string, unknown> = {}
      if (body.name !== undefined) {
        const name = body.name.trim()
        if (!name) return json({ error: 'Le nom ne peut pas être vide' }, 400)
        patch.name = name
      }
      if (body.entity_type !== undefined) {
        if (!ENTITY_TYPES.includes(body.entity_type)) return json({ error: "Type d'entité invalide" }, 400)
        patch.entity_type = body.entity_type
      }
      if (body.sector !== undefined) patch.sector = body.sector
      if (body.city !== undefined) patch.city = body.city
      if (body.country !== undefined) patch.country = body.country
      if (body.parent_org_id !== undefined) {
        const p = body.parent_org_id
        if (p === entityId) return json({ error: "Une entité ne peut pas être son propre parent" }, 400)
        if (p !== groupId && !descendantIds.has(p)) return json({ error: 'Parent hors de votre périmètre' }, 403)
        patch.parent_org_id = p
      }
      if (body.criticality !== undefined && !CRITICALITY.includes(body.criticality)) {
        return json({ error: 'Criticité invalide' }, 400)
      }
      if (body.reg_status !== undefined && !REG_STATUS.includes(body.reg_status)) {
        return json({ error: 'Statut invalide' }, 400)
      }
      const prof = profilePatch(body)
      if (Object.keys(patch).length === 0 && !prof) return json({ error: 'Aucune modification' }, 400)

      if (Object.keys(patch).length > 0) {
        const { error } = await admin.from('organizations').update(patch).eq('id', entityId)
        if (error) {
          console.error('[manage-entity] update:', error.message)
          return json({ error: "Impossible de modifier l'entité" }, 500)
        }
      }
      if (prof) {
        const { error: perr } = await admin
          .from('entity_regulatory_profile')
          .upsert({ organization_id: entityId, ...prof }, { onConflict: 'organization_id' })
        if (perr) {
          console.error('[manage-entity] update profile:', perr.message)
          return json({ error: 'Impossible de modifier le profil réglementaire' }, 500)
        }
      }
      const { data: updated } = await admin
        .from('organizations')
        .select('id, name, entity_type, parent_org_id, sector, city, country, is_active')
        .eq('id', entityId)
        .single()
      return json({ entity: updated })
    }

    // ---- DEACTIVATE ----------------------------------------------------------
    if (action === 'deactivate') {
      // Refus s'il reste des missions actives sur l'entité (données vivantes).
      const { count } = await admin
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', entityId)
        .neq('status', 'closure')
      if ((count ?? 0) > 0) {
        return json({ error: 'Des missions actives existent sur cette entité. Clôturez-les avant de la désactiver.' }, 409)
      }
      const { error } = await admin.from('organizations').update({ is_active: false }).eq('id', entityId)
      if (error) {
        console.error('[manage-entity] deactivate:', error.message)
        return json({ error: "Impossible de désactiver l'entité" }, 500)
      }
      return json({ ok: true })
    }

    // ---- REACTIVATE ----------------------------------------------------------
    if (action === 'reactivate') {
      const { error } = await admin.from('organizations').update({ is_active: true }).eq('id', entityId)
      if (error) {
        console.error('[manage-entity] reactivate:', error.message)
        return json({ error: "Impossible de réactiver l'entité" }, 500)
      }
      return json({ ok: true })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (e) {
    console.error('[manage-entity] unexpected:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Erreur interne' }, 500)
  }
})
