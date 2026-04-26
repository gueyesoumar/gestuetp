import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-feature-flags
 *
 * Toggle des flags globaux. Lecture publique (table en RLS read-all),
 * mais l'écriture passe par cette fonction pour garantir audit + motif.
 */

interface ToggleBody {
  action: 'toggle'
  slug: string
  enabled: boolean
  reason: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as ToggleBody
    if (body.action !== 'toggle') {
      return jsonResponse({ error: `Action inconnue: ${body.action}` }, 400)
    }
    if (!body.slug || typeof body.enabled !== 'boolean' || !body.reason?.trim()) {
      return jsonResponse({ error: 'slug, enabled et reason requis' }, 400)
    }

    const { data: flag, error: loadError } = await admin
      .from('feature_flags')
      .select('id, slug, name, is_globally_enabled')
      .eq('slug', body.slug)
      .single()

    if (loadError || !flag) {
      return jsonResponse({ error: 'Flag introuvable' }, 404)
    }
    const f = flag as { id: string; slug: string; name: string; is_globally_enabled: boolean }

    if (f.is_globally_enabled === body.enabled) {
      return jsonResponse({ already: true, is_globally_enabled: f.is_globally_enabled })
    }

    // deno-lint-ignore no-explicit-any
    const { error: updateError } = await (admin.from('feature_flags') as any)
      .update({ is_globally_enabled: body.enabled, updated_by: owner.id })
      .eq('id', f.id)

    if (updateError) {
      console.error('[admin-feature-flags] update error:', updateError.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }

    await logAdminAction(admin, owner.id, body.enabled ? 'enable_feature_flag' : 'disable_feature_flag', 'feature_flag', f.id, body.reason, {
      slug: f.slug,
      name: f.name,
      previous: f.is_globally_enabled,
      new: body.enabled,
    })

    return jsonResponse({ success: true, is_globally_enabled: body.enabled })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-feature-flags] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
