// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * admin-set-org-engine — fixe le MOTEUR de mission d'une organisation
 * (organizations.workflow_version, RFC 0003). Réservé au super-admin.
 *
 * Attribution SYMÉTRIQUE et LIBRE : 'audit' ou 'controle', indépendamment de
 * l'édition. Ne change QUE le défaut des NOUVELLES missions de l'org (les
 * missions existantes gardent leur snapshot). Calqué sur admin-update-organization.
 */

const ENGINES = new Set(['audit', 'controle'])

interface Body {
  organization_id: string
  workflow_version: string
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
    if (!ENGINES.has(body.workflow_version)) {
      return jsonResponse({ error: 'Moteur invalide (audit | controle)' }, 400)
    }

    const { data: target, error: fetchErr } = await (admin.from('organizations') as any)
      .select('id, name, workflow_version')
      .eq('id', body.organization_id)
      .single()
    if (fetchErr || !target) return jsonResponse({ error: 'Organisation introuvable' }, 404)
    const t = target as { id: string; name: string; workflow_version: string }

    // No-op explicite : pas d'écriture, pas de log.
    if (t.workflow_version === body.workflow_version) {
      return jsonResponse({ success: true, unchanged: true, workflow_version: t.workflow_version })
    }

    const { error: updateErr } = await (admin.from('organizations') as any)
      .update({ workflow_version: body.workflow_version })
      .eq('id', body.organization_id)
    if (updateErr) {
      console.error('[admin-set-org-engine] update:', updateErr.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }

    try {
      await logAdminAction(admin, owner.id, 'organization.set_engine', 'organization', t.id, body.reason, {
        previous: t.workflow_version, new: body.workflow_version, organization_name: t.name,
      })
    } catch (logErr) {
      console.error('[admin-set-org-engine] audit log:', logErr instanceof Error ? logErr.message : logErr)
    }

    return jsonResponse({ success: true, workflow_version: body.workflow_version })
  } catch (err) {
    console.error('[admin-set-org-engine]', err instanceof Error ? err.message : err)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})
