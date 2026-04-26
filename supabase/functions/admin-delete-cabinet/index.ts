import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-delete-cabinet
 *
 * Suppression définitive d'un cabinet.
 *  - Triple confirmation côté front : nom exact + mot SUPPRIMER + motif
 *  - Refuse si le cabinet contient un platform_owner (anti-sabotage)
 *  - Refuse si missions actives non clôturées (sauf force=true)
 *  - Avant DELETE : snapshot léger (counts + emails owners) en metadata du log
 *  - DELETE CASCADE via la FK on delete cascade existante
 *
 * Le snapshot est stocké en metadata pour permettre une récupération forensique
 * (qui était dans le cabinet, combien de missions, etc.). Pas un backup complet.
 */

interface Body {
  cabinet_id: string
  cabinet_name_confirmation: string
  reason: string
  force?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.cabinet_id || !body.cabinet_name_confirmation || !body.reason?.trim()) {
      return jsonResponse({ error: 'cabinet_id, cabinet_name_confirmation et reason requis' }, 400)
    }

    const { data: cabinet, error: loadError } = await admin
      .from('organizations')
      .select('id, name, slug, is_active')
      .eq('id', body.cabinet_id)
      .single()

    if (loadError || !cabinet) {
      return jsonResponse({ error: 'Cabinet introuvable' }, 404)
    }
    const c = cabinet as { id: string; name: string; slug: string; is_active: boolean }

    // 1. Double-vérif que le nom tapé correspond exactement
    if (body.cabinet_name_confirmation !== c.name) {
      return jsonResponse({ error: 'Le nom de confirmation ne correspond pas' }, 400)
    }

    // 2. Refus si platform owners présents (anti-sabotage)
    const { data: ownersInside } = await admin
      .from('users')
      .select('id, email, is_platform_owner')
      .eq('organization_id', c.id)
      .eq('is_platform_owner', true)
    if ((ownersInside ?? []).length > 0) {
      const emails = (ownersInside ?? []).map((o) => (o as { email: string }).email).join(', ')
      return jsonResponse({ error: `Suppression refusée : ${emails} est platform owner. Retirez le flag avant.` }, 403)
    }

    // 3. Refus si missions actives non clôturées, sauf force=true
    const { count: activeMissions } = await admin
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('cabinet_id', c.id)
      .neq('status', 'closure')
      .eq('is_active', true)
    if ((activeMissions ?? 0) > 0 && !body.force) {
      return jsonResponse({
        error: `Ce cabinet a ${activeMissions} mission(s) active(s) non clôturée(s). Confirmez avec force=true si vous êtes sûr.`,
        active_missions: activeMissions,
      }, 409)
    }

    // 4. Snapshot léger (members + counts) pour audit
    const { data: members } = await admin
      .from('users')
      .select('id, email, first_name, last_name, is_active')
      .eq('organization_id', c.id)
    const { count: totalMissions } = await admin
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('cabinet_id', c.id)

    const snapshot = {
      cabinet: { id: c.id, name: c.name, slug: c.slug, is_active: c.is_active },
      members: (members ?? []).slice(0, 100),
      members_total: (members ?? []).length,
      missions_total: totalMissions ?? 0,
      active_missions_at_delete: activeMissions ?? 0,
      forced: body.force === true,
    }

    // 5. Log AVANT le DELETE (sinon FK actor sur cabinet supprimé pourrait poser souci)
    await logAdminAction(admin, owner.id, 'delete_cabinet', 'organization', c.id, body.reason, snapshot)

    // 6. DELETE — les FK ON DELETE CASCADE font le reste
    // deno-lint-ignore no-explicit-any
    const { error: deleteError } = await (admin.from('organizations') as any).delete().eq('id', c.id)
    if (deleteError) {
      console.error('[admin-delete-cabinet] delete error:', deleteError.message)
      return jsonResponse({ error: 'Suppression impossible (contraintes FK)', detail: deleteError.message }, 500)
    }

    return jsonResponse({ success: true, snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-delete-cabinet] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
