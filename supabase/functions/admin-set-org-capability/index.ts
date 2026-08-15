// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * admin-set-org-capability — active/désactive un MODULE Hub à la carte d'une
 * organisation (organization_capabilities, RFC 0002). Réservé au super-admin.
 *
 * Seuls les modules « à la carte » sont pilotables ici : les capacités
 * structurelles (comply, supervision, incidents, measures) restent dérivées de
 * l'édition de l'org. Calqué sur admin-set-org-engine.
 */

const ALA_CARTE = new Set(['risk', 'policy', 'privacy', 'awareness'])

interface Body {
  organization_id: string
  capability: string
  enabled: boolean
  reason: string
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.organization_id?.trim() || !body.reason?.trim()) {
      return jsonResponse({ error: 'organization_id et reason sont requis' }, 400)
    }
    if (!ALA_CARTE.has(body.capability)) {
      return jsonResponse({ error: 'Module non activable à la carte' }, 400)
    }
    if (typeof body.enabled !== 'boolean') {
      return jsonResponse({ error: 'enabled (booléen) requis' }, 400)
    }

    const { data: target, error: fetchErr } = await (admin.from('organizations') as any)
      .select('id, name')
      .eq('id', body.organization_id)
      .single()
    if (fetchErr || !target) return jsonResponse({ error: 'Organisation introuvable' }, 404)
    const t = target as { id: string; name: string }

    const status = body.enabled ? 'active' : 'disabled'
    const { error: upErr } = await (admin.from('organization_capabilities') as any)
      .upsert(
        { org_id: body.organization_id, capability: body.capability, status },
        { onConflict: 'org_id,capability' },
      )
    if (upErr) {
      console.error('[admin-set-org-capability] upsert:', upErr.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }

    try {
      await logAdminAction(admin, owner.id, 'organization.set_capability', 'organization', t.id, body.reason, {
        capability: body.capability, enabled: body.enabled, organization_name: t.name,
      })
    } catch (logErr) {
      console.error('[admin-set-org-capability] audit log:', logErr instanceof Error ? logErr.message : logErr)
    }

    return jsonResponse({ success: true, capability: body.capability, enabled: body.enabled })
  } catch (err) {
    console.error('[admin-set-org-capability]', err instanceof Error ? err.message : err)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})
