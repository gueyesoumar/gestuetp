import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-update-organization
 *
 * Permet à un super-admin Gëstu de modifier les types d'une organisation
 * (cabinet, client, group). Réservé strictement à un user actif avec
 * is_platform_owner = true.
 *
 * Sécurité :
 *  - garde requirePlatformOwner (vérifie is_platform_owner + is_active)
 *  - refus explicite si le payload contient 'platform' (réservé, jamais
 *    octroyé via cette voie ; passer par SQL direct si nécessaire)
 *  - validation côté app + double check côté DB (CHECK organizations_*)
 *  - audit log obligatoire (motif requis dans le payload)
 *
 * À noter : le service-role utilisé pour l'UPDATE bypasse à la fois RLS
 * et le trigger 00095 (qui filtre sur auth.uid() IS NOT NULL).
 */

const CANONICAL_TYPES = new Set(['cabinet', 'client', 'group'])

interface Body {
  organization_id: string
  types: string[]
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
    const body = await req.json() as Body

    if (!body.organization_id?.trim() || !body.reason?.trim()) {
      return jsonResponse({ error: 'organization_id et reason sont requis' }, 400)
    }
    if (!Array.isArray(body.types) || body.types.length === 0) {
      return jsonResponse({ error: 'Au moins un type est requis' }, 400)
    }
    if (body.types.includes('platform')) {
      return jsonResponse({ error: 'Le type "platform" est réservé et ne peut pas être attribué via cette interface' }, 403)
    }
    const invalid = body.types.find((t) => !CANONICAL_TYPES.has(t))
    if (invalid) {
      return jsonResponse({ error: `Type invalide : "${invalid}". Valeurs autorisées : cabinet, client, group` }, 400)
    }
    // Dédup côté serveur pour éviter ['cabinet','cabinet']
    const newTypes = [...new Set(body.types)]

    // Charger l'org cible pour audit + refuser de toucher à une org platform
    // deno-lint-ignore no-explicit-any
    const { data: target, error: fetchErr } = await (admin.from('organizations') as any)
      .select('id, name, types')
      .eq('id', body.organization_id)
      .single()

    if (fetchErr || !target) {
      return jsonResponse({ error: 'Organisation introuvable' }, 404)
    }
    const targetRow = target as { id: string; name: string; types: string[] }
    if (targetRow.types.includes('platform')) {
      return jsonResponse({ error: 'Une organisation "platform" ne peut pas être éditée via cette interface' }, 403)
    }

    // No-op explicite : pas d'écriture, pas de log
    const sortedOld = [...targetRow.types].sort()
    const sortedNew = [...newTypes].sort()
    if (sortedOld.join(',') === sortedNew.join(',')) {
      return jsonResponse({ success: true, unchanged: true, types: targetRow.types })
    }

    // deno-lint-ignore no-explicit-any
    const { error: updateErr } = await (admin.from('organizations') as any)
      .update({ types: newTypes })
      .eq('id', body.organization_id)

    if (updateErr) {
      console.error('[admin-update-organization] update failed:', updateErr.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }

    try {
      await logAdminAction(
        admin,
        owner.id,
        'organization.update_types',
        'organization',
        targetRow.id,
        body.reason,
        { previous_types: targetRow.types, new_types: newTypes, organization_name: targetRow.name },
      )
    } catch (logErr) {
      // Log best-effort : on n'annule pas l'update si l'audit échoue
      console.error('[admin-update-organization] audit log failed:', logErr instanceof Error ? logErr.message : logErr)
    }

    return jsonResponse({ success: true, types: newTypes })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-update-organization] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
