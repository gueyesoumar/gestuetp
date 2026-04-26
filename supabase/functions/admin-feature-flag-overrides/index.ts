import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-feature-flag-overrides
 *
 * Gère les overrides de feature flags par organisation.
 * Toutes les actions exigent : auth platform_owner + motif obligatoire + audit log.
 *
 * Actions :
 *   - set    : upsert l'override (enabled true|false)
 *   - reset  : supprime l'override (retour à hérité)
 */

interface SetBody { action: 'set'; cabinet_id: string; flag_slug: string; enabled: boolean; reason: string }
interface ResetBody { action: 'reset'; cabinet_id: string; flag_slug: string; reason: string }
type Body = SetBody | ResetBody

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.cabinet_id || !body.flag_slug || !body.reason?.trim()) {
      return jsonResponse({ error: 'cabinet_id, flag_slug et reason requis' }, 400)
    }

    // Charger le flag (par slug → id)
    const { data: flag, error: flagError } = await admin
      .from('feature_flags')
      .select('id, slug, name, is_globally_enabled')
      .eq('slug', body.flag_slug)
      .single()
    if (flagError || !flag) {
      return jsonResponse({ error: 'Flag introuvable' }, 404)
    }
    const f = flag as { id: string; slug: string; name: string; is_globally_enabled: boolean }

    // Vérifier le cabinet
    const { data: cab } = await admin
      .from('organizations')
      .select('id, name')
      .eq('id', body.cabinet_id)
      .single()
    if (!cab) return jsonResponse({ error: 'Cabinet introuvable' }, 404)
    const c = cab as { id: string; name: string }

    if (body.action === 'set') {
      if (typeof body.enabled !== 'boolean') {
        return jsonResponse({ error: 'enabled (boolean) requis' }, 400)
      }
      // deno-lint-ignore no-explicit-any
      const { error: upsertError } = await (admin.from('feature_flag_overrides') as any)
        .upsert({
          flag_id: f.id,
          organization_id: c.id,
          enabled: body.enabled,
          reason: body.reason.trim(),
          updated_by: owner.id,
        }, { onConflict: 'flag_id,organization_id' })

      if (upsertError) {
        console.error('[admin-ffo] upsert error:', upsertError.message)
        return jsonResponse({ error: 'Mise à jour de l\'override impossible' }, 500)
      }

      await logAdminAction(admin, owner.id, 'set_feature_flag_override', 'organization', c.id, body.reason, {
        flag_slug: f.slug,
        flag_name: f.name,
        cabinet_name: c.name,
        enabled: body.enabled,
        global_value: f.is_globally_enabled,
      })

      return jsonResponse({ success: true, enabled: body.enabled })
    }

    if (body.action === 'reset') {
      // deno-lint-ignore no-explicit-any
      const { error: deleteError, count } = await (admin.from('feature_flag_overrides') as any)
        .delete({ count: 'exact' })
        .eq('flag_id', f.id)
        .eq('organization_id', c.id)

      if (deleteError) {
        console.error('[admin-ffo] delete error:', deleteError.message)
        return jsonResponse({ error: 'Réinitialisation impossible' }, 500)
      }
      if ((count ?? 0) === 0) {
        return jsonResponse({ already_inherited: true })
      }

      await logAdminAction(admin, owner.id, 'reset_feature_flag_override', 'organization', c.id, body.reason, {
        flag_slug: f.slug,
        flag_name: f.name,
        cabinet_name: c.name,
        global_value: f.is_globally_enabled,
      })

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Action inconnue' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-ffo] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
