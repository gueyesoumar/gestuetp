import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : upload-cabinet-logo
 *
 * Upload du logo cabinet vers le bucket cabinet-branding et update de
 * organization_branding.logo_<variant>_url. Multipart/form-data.
 *
 * Champs requis :
 *   - cabinet_id : uuid de l'organisation
 *   - variant    : 'light' | 'dark'
 *   - reason     : motif (audit log)
 *   - file       : fichier PNG ou SVG, ≤ 500 Ko
 *
 * SVG : sanitization stricte (suppression <script>, <foreignObject>, attrs on*,
 * href javascript:, xlink:href javascript:). Refus si malformé.
 *
 * Sécurité : platform_owner uniquement, validation MIME stricte côté serveur,
 * checksum SHA-256 logué, ancien logo de la même variante supprimé après upload.
 */

const MAX_BYTES = 524_288 // 500 Ko
const ALLOWED_MIME = new Set(['image/png', 'image/svg+xml'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const form = await req.formData()
    const cabinetId = String(form.get('cabinet_id') ?? '').trim()
    const variant = String(form.get('variant') ?? '').trim() as 'light' | 'dark'
    const reason = String(form.get('reason') ?? '').trim()
    const file = form.get('file')

    if (!cabinetId) return jsonResponse({ error: 'cabinet_id requis' }, 400)
    if (variant !== 'light' && variant !== 'dark') {
      return jsonResponse({ error: 'variant doit être light ou dark' }, 400)
    }
    if (!reason) return jsonResponse({ error: 'reason requis' }, 400)
    if (!(file instanceof File)) return jsonResponse({ error: 'file requis' }, 400)

    if (file.size > MAX_BYTES) {
      return jsonResponse({ error: `Fichier trop volumineux (max ${MAX_BYTES} octets)` }, 413)
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return jsonResponse({ error: 'Type de fichier non autorisé (PNG ou SVG uniquement)' }, 415)
    }

    const { data: cab } = await admin
      .from('organizations')
      .select('id, name')
      .eq('id', cabinetId)
      .single()
    if (!cab) return jsonResponse({ error: 'Organisation introuvable' }, 404)
    const c = cab as { id: string; name: string }

    let bytes = new Uint8Array(await file.arrayBuffer())
    let finalMime = file.type
    let finalExt = file.type === 'image/svg+xml' ? 'svg' : 'png'

    // Sanitize SVG
    if (file.type === 'image/svg+xml') {
      const sourceText = new TextDecoder('utf-8').decode(bytes)
      const sanitized = sanitizeSvg(sourceText)
      if (!sanitized.ok) {
        return jsonResponse({ error: `SVG refusé : ${sanitized.reason}` }, 422)
      }
      bytes = new TextEncoder().encode(sanitized.svg)
    } else {
      // Vérification du magic number PNG (89 50 4E 47 0D 0A 1A 0A)
      if (
        bytes.length < 8 ||
        bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47 ||
        bytes[4] !== 0x0D || bytes[5] !== 0x0A || bytes[6] !== 0x1A || bytes[7] !== 0x0A
      ) {
        return jsonResponse({ error: 'PNG invalide (magic number manquant)' }, 422)
      }
    }

    // Checksum SHA-256 pour audit
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    const checksum = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')

    const timestamp = Date.now()
    const path = `${c.id}/logo-${variant}-${timestamp}.${finalExt}`

    const { error: uploadError } = await admin.storage
      .from('cabinet-branding')
      .upload(path, bytes, {
        contentType: finalMime,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload-cabinet-logo] upload error:', uploadError.message)
      return jsonResponse({ error: 'Upload impossible' }, 500)
    }

    const { data: urlData } = admin.storage.from('cabinet-branding').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // Récupère l'URL existante pour pouvoir nettoyer après update
    const { data: existing } = await admin
      .from('organization_branding')
      .select('logo_light_url, logo_dark_url')
      .eq('organization_id', c.id)
      .maybeSingle()

    const e = existing as { logo_light_url: string | null; logo_dark_url: string | null } | null
    const previousUrl = variant === 'light' ? e?.logo_light_url ?? null : e?.logo_dark_url ?? null

    const updatePayload: Record<string, unknown> = {
      organization_id: c.id,
      [`logo_${variant}_url`]: publicUrl,
      updated_by: owner.id,
      updated_at: new Date().toISOString(),
    }

    // deno-lint-ignore no-explicit-any
    const { error: upsertError } = await (admin.from('organization_branding') as any)
      .upsert(updatePayload, { onConflict: 'organization_id' })

    if (upsertError) {
      // On a uploadé mais le metadata a échoué → cleanup
      await admin.storage.from('cabinet-branding').remove([path])
      console.error('[upload-cabinet-logo] upsert error:', upsertError.message)
      return jsonResponse({ error: 'Mise à jour metadata impossible' }, 500)
    }

    // Supprime l'ancien fichier si on remplace
    if (previousUrl) {
      const previousPath = extractStoragePath(previousUrl, c.id)
      if (previousPath) {
        await admin.storage.from('cabinet-branding').remove([previousPath])
      }
    }

    await logAdminAction(admin, owner.id, 'upload_cabinet_logo', 'organization', c.id, reason, {
      cabinet_name: c.name,
      variant,
      mime: finalMime,
      bytes: bytes.length,
      checksum_sha256: checksum,
      path,
      replaced_previous: Boolean(previousUrl),
    })

    return jsonResponse({ success: true, url: publicUrl, variant })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[upload-cabinet-logo] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

interface SvgResult { ok: true; svg: string } | { ok: false; reason: string }

/**
 * Sanitization SVG minimaliste mais suffisante pour le cas d'usage logo :
 *  - balises interdites : script, foreignObject, iframe, object, embed, use[xlink:href=javascript:]
 *  - attrs interdits : on* (onload, onclick, ...), href|xlink:href avec javascript:
 *  - le résultat doit toujours commencer par un tag <svg
 *
 * Ne couvre pas les SVG ultra-exotiques — pour ça, refuser et demander un PNG.
 */
function sanitizeSvg(source: string): SvgResult {
  if (source.length > 200_000) {
    return { ok: false, reason: 'Fichier trop volumineux pour parsing' }
  }

  let svg = source

  // Drop BOM
  if (svg.charCodeAt(0) === 0xFEFF) svg = svg.slice(1)
  svg = svg.trim()

  // Doit contenir <svg
  if (!/<svg[\s>]/i.test(svg)) {
    return { ok: false, reason: 'tag <svg> manquant' }
  }

  // Supprime DOCTYPE pour éviter XXE
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  // Supprime entités externes
  svg = svg.replace(/<!ENTITY[\s\S]*?>/gi, '')

  // Supprime balises dangereuses (avec leur contenu pour script/style/foreignObject)
  svg = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, '')
  svg = svg.replace(/<style[\s\S]*?<\/style\s*>/gi, '')
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
  svg = svg.replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, '')
  svg = svg.replace(/<object[\s\S]*?<\/object\s*>/gi, '')
  svg = svg.replace(/<embed\b[^>]*\/?>/gi, '')
  // Auto-fermantes
  svg = svg.replace(/<script\b[^>]*\/>/gi, '')
  svg = svg.replace(/<foreignObject\b[^>]*\/>/gi, '')

  // Supprime tous les attributs on* (onload, onclick, onmouseover, ...)
  svg = svg.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')

  // Supprime href / xlink:href contenant javascript: ou data:text/html
  svg = svg.replace(/\s+(?:xlink:)?href\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '')
  svg = svg.replace(/\s+(?:xlink:)?href\s*=\s*("\s*data:text\/html[^"]*"|'\s*data:text\/html[^']*')/gi, '')

  // Supprime style="..." pour éviter url(javascript:...) ou expression()
  svg = svg.replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, (match) => {
    if (/javascript:|expression\(/i.test(match)) return ''
    return match
  })

  if (!/<svg[\s>]/i.test(svg)) {
    return { ok: false, reason: 'svg vidé après sanitization' }
  }

  return { ok: true, svg }
}

/**
 * Extrait le path Storage à partir de l'URL publique.
 * Format URL : .../storage/v1/object/public/cabinet-branding/<cabinet_id>/<file>
 * Path attendu : <cabinet_id>/<file>
 */
function extractStoragePath(url: string, cabinetId: string): string | null {
  const marker = `/cabinet-branding/${cabinetId}/`
  const idx = url.indexOf(marker)
  if (idx < 0) return null
  return `${cabinetId}/${url.slice(idx + marker.length)}`
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
