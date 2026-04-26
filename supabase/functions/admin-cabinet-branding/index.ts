import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-cabinet-branding
 *
 * Gère le branding de marque blanche d'un cabinet (couleurs, emails, footer).
 * Les logos passent par upload-cabinet-logo (multipart). La table
 * organization_branding peut exister avec logos null le temps que le cabinet
 * upload — l'activation effective côté frontend exige logo_light_url ET le
 * flag white_label_branding ON pour ce cabinet.
 *
 * Actions :
 *   - get    : retourne la config actuelle (ou null si jamais configurée)
 *   - upsert : crée/met à jour les champs metadata (couleurs, emails)
 *   - clear  : supprime totalement la config (logos compris en cascade Storage)
 *
 * Sécurité : platform_owner uniquement, motif obligatoire sur upsert/clear,
 * audit log pour chaque écriture, validation stricte des couleurs et emails.
 */

interface GetBody { action: 'get'; cabinet_id: string }
interface UpsertBody {
  action: 'upsert'
  cabinet_id: string
  reason: string
  primary_color?: string | null
  accent_color?: string | null
  support_email?: string | null
  email_from_name?: string | null
  footer_text?: string | null
}
interface ClearBody { action: 'clear'; cabinet_id: string; reason: string }
type Body = GetBody | UpsertBody | ClearBody

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.cabinet_id) {
      return jsonResponse({ error: 'cabinet_id requis' }, 400)
    }

    const { data: cab } = await admin
      .from('organizations')
      .select('id, name, types')
      .eq('id', body.cabinet_id)
      .single()
    if (!cab) return jsonResponse({ error: 'Organisation introuvable' }, 404)
    const c = cab as { id: string; name: string; types: string[] }

    if (body.action === 'get') {
      const { data, error } = await admin
        .from('organization_branding')
        .select('organization_id, logo_light_url, logo_dark_url, primary_color, accent_color, support_email, email_from_name, footer_text, updated_at, updated_by')
        .eq('organization_id', c.id)
        .maybeSingle()
      if (error) {
        console.error('[admin-cabinet-branding] get error:', error.message)
        return jsonResponse({ error: 'Lecture impossible' }, 500)
      }
      return jsonResponse({ branding: data ?? null, cabinet: { id: c.id, name: c.name } })
    }

    if (body.action === 'upsert') {
      if (!body.reason?.trim()) {
        return jsonResponse({ error: 'reason requis' }, 400)
      }

      const validation = validateUpsertPayload(body)
      if (validation) return jsonResponse({ error: validation }, 400)

      const payload: Record<string, unknown> = {
        organization_id: c.id,
        primary_color: body.primary_color ?? null,
        accent_color: body.accent_color ?? null,
        support_email: body.support_email?.trim() ?? null,
        email_from_name: body.email_from_name?.trim() ?? null,
        footer_text: body.footer_text?.trim() ?? null,
        updated_by: owner.id,
        updated_at: new Date().toISOString(),
      }

      // deno-lint-ignore no-explicit-any
      const { error: upsertError } = await (admin.from('organization_branding') as any)
        .upsert(payload, { onConflict: 'organization_id' })

      if (upsertError) {
        console.error('[admin-cabinet-branding] upsert error:', upsertError.message)
        return jsonResponse({ error: 'Mise à jour impossible' }, 500)
      }

      await logAdminAction(admin, owner.id, 'update_cabinet_branding', 'organization', c.id, body.reason, {
        cabinet_name: c.name,
        primary_color: payload.primary_color,
        accent_color: payload.accent_color,
        support_email: payload.support_email,
        email_from_name: payload.email_from_name,
      })

      return jsonResponse({ success: true })
    }

    if (body.action === 'clear') {
      if (!body.reason?.trim()) {
        return jsonResponse({ error: 'reason requis' }, 400)
      }

      // Supprimer aussi les fichiers Storage du cabinet
      const { data: files } = await admin.storage
        .from('cabinet-branding')
        .list(c.id, { limit: 100 })
      if (files && files.length > 0) {
        const paths = files.map((f) => `${c.id}/${f.name}`)
        await admin.storage.from('cabinet-branding').remove(paths)
      }

      // deno-lint-ignore no-explicit-any
      const { error: deleteError } = await (admin.from('organization_branding') as any)
        .delete()
        .eq('organization_id', c.id)

      if (deleteError) {
        console.error('[admin-cabinet-branding] delete error:', deleteError.message)
        return jsonResponse({ error: 'Suppression impossible' }, 500)
      }

      await logAdminAction(admin, owner.id, 'clear_cabinet_branding', 'organization', c.id, body.reason, {
        cabinet_name: c.name,
        files_removed: files?.length ?? 0,
      })

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Action inconnue' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-cabinet-branding] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function validateUpsertPayload(body: UpsertBody): string | null {
  if (body.primary_color != null && !HEX_COLOR.test(body.primary_color)) {
    return 'primary_color doit être au format #RRGGBB'
  }
  if (body.accent_color != null && !HEX_COLOR.test(body.accent_color)) {
    return 'accent_color doit être au format #RRGGBB'
  }
  if (body.support_email != null) {
    const trimmed = body.support_email.trim()
    if (trimmed.length === 0) {
      // null OK, vide pas OK
      return 'support_email vide'
    }
    if (trimmed.length > 254 || !EMAIL_RE.test(trimmed)) {
      return 'support_email invalide'
    }
  }
  if (body.email_from_name != null) {
    const trimmed = body.email_from_name.trim()
    if (trimmed.length === 0 || trimmed.length > 80) {
      return 'email_from_name doit faire entre 1 et 80 caractères'
    }
  }
  if (body.footer_text != null && body.footer_text.length > 280) {
    return 'footer_text limité à 280 caractères'
  }
  return null
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
