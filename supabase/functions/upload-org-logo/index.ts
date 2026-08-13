// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'
import { sanitizeSvg } from '../_shared/svg-sanitize.ts'
import { logActivity } from '../_shared/audit-log.ts'

/**
 * upload-org-logo — téléversement du logo d'identité de l'organisation
 * d'appartenance de l'appelant (affiché dans le Hub). Écrit organizations.logo_url.
 *
 * Sécurité (CLAUDE.md §3) :
 *  - JWT vérifié (authenticateCaller) ; opération sensible → service_role.
 *  - L'appelant doit détenir can_edit_organization ; la cible est TOUJOURS sa
 *    propre organisation (caller.organization_id) — aucun org_id n'est accepté du
 *    client (anti-IDOR).
 *  - Validation MIME/taille stricte côté serveur, SVG sanitizé, ancien logo purgé.
 */

const MAX_BYTES = 524_288 // 500 Ko
const ALLOWED_MIME = new Set(['image/png', 'image/svg+xml'])
const BUCKET = 'organization-logos'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function extractStoragePath(url: string, orgId: string): string | null {
  const marker = `/${BUCKET}/${orgId}/`
  const idx = url.indexOf(marker)
  if (idx < 0) return null
  return `${orgId}/${url.slice(idx + marker.length)}`
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
    const orgId = caller.organization_id
    if (!orgId) return json({ error: 'Organisation introuvable' }, 400)
    if (!(await hasCabinetPerm(admin, caller.id, 'can_edit_organization'))) {
      return json({ error: 'Permission de modification de l’organisation requise' }, 403)
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return json({ error: 'file requis' }, 400)
    if (file.size > MAX_BYTES) return json({ error: `Fichier trop volumineux (max ${MAX_BYTES} octets)` }, 413)
    if (!ALLOWED_MIME.has(file.type)) return json({ error: 'Type de fichier non autorisé (PNG ou SVG uniquement)' }, 415)

    let bytes = new Uint8Array(await file.arrayBuffer())
    const finalMime = file.type
    const finalExt = file.type === 'image/svg+xml' ? 'svg' : 'png'

    if (file.type === 'image/svg+xml') {
      const sanitized = sanitizeSvg(new TextDecoder('utf-8').decode(bytes))
      if (!sanitized.ok) return json({ error: `SVG refusé : ${sanitized.reason}` }, 422)
      bytes = new TextEncoder().encode(sanitized.svg)
    }

    const path = `${orgId}/logo-${Date.now()}.${finalExt}`
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: finalMime, cacheControl: '3600', upsert: false })
    if (uploadError) {
      console.error('[upload-org-logo] upload:', uploadError.message)
      return json({ error: 'Upload impossible' }, 500)
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // URL précédente (pour purge après update)
    const { data: existing } = await admin.from('organizations').select('logo_url').eq('id', orgId).single()
    const previousUrl = (existing as { logo_url: string | null } | null)?.logo_url ?? null

    const { error: updateError } = await admin.from('organizations').update({ logo_url: publicUrl }).eq('id', orgId)
    if (updateError) {
      await admin.storage.from(BUCKET).remove([path]) // rollback fichier orphelin
      console.error('[upload-org-logo] update:', updateError.message)
      return json({ error: 'Mise à jour impossible' }, 500)
    }

    if (previousUrl) {
      const previousPath = extractStoragePath(previousUrl, orgId)
      if (previousPath) await admin.storage.from(BUCKET).remove([previousPath])
    }

    await logActivity(admin, {
      organizationId: orgId, actorUserId: caller.id,
      action: 'org_logo.uploaded', targetType: 'organization', targetId: orgId,
      summary: 'Logo de l’organisation mis à jour',
    })
    return json({ success: true, url: publicUrl })
  } catch (e) {
    console.error('[upload-org-logo] unexpected:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Erreur interne' }, 500)
  }
})
