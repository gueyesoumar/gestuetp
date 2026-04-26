import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-cabinet-domain
 *
 * Gère les domaines custom (CNAME) d'un cabinet pour la marque blanche niveau 3.
 *
 * Actions :
 *   - list   : liste les domaines du cabinet
 *   - add    : ajoute un nouveau hostname (génère un verification_token)
 *   - remove : supprime le domaine (et donc l'entrée de routing tenant)
 *
 * La vérification DNS effective est faite par dns-verify-tenant (séparé pour
 * permettre les retries automatiques sans repasser par cette function).
 *
 * Sécurité : platform_owner uniquement, motif obligatoire, audit log,
 * validation regex stricte du hostname côté serveur.
 */

const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/

interface ListBody { action: 'list'; cabinet_id: string }
interface AddBody { action: 'add'; cabinet_id: string; hostname: string; reason: string }
interface RemoveBody { action: 'remove'; cabinet_id: string; domain_id: string; reason: string }
type Body = ListBody | AddBody | RemoveBody

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
      .select('id, name')
      .eq('id', body.cabinet_id)
      .single()
    if (!cab) return jsonResponse({ error: 'Organisation introuvable' }, 404)
    const c = cab as { id: string; name: string }

    if (body.action === 'list') {
      const { data, error } = await admin
        .from('cabinet_domains')
        .select('id, hostname, is_verified, ssl_status, verification_token, verified_at, last_checked_at, last_error, created_at')
        .eq('cabinet_id', c.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[admin-cabinet-domain] list error:', error.message)
        return jsonResponse({ error: 'Lecture impossible' }, 500)
      }
      return jsonResponse({ domains: data ?? [] })
    }

    if (body.action === 'add') {
      if (!body.reason?.trim()) return jsonResponse({ error: 'reason requis' }, 400)
      const hostname = String(body.hostname ?? '').trim().toLowerCase()
      if (!hostname || hostname.length < 4 || hostname.length > 253 || !HOSTNAME_RE.test(hostname)) {
        return jsonResponse({ error: 'hostname invalide' }, 400)
      }

      // Anti-collision : un hostname ne peut appartenir qu'à un seul cabinet
      const { data: existing } = await admin
        .from('cabinet_domains')
        .select('id, cabinet_id')
        .eq('hostname', hostname)
        .maybeSingle()
      if (existing) {
        return jsonResponse({ error: 'Ce hostname est déjà utilisé' }, 409)
      }

      const verificationToken = generateToken()

      // deno-lint-ignore no-explicit-any
      const { data: inserted, error: insertError } = await (admin.from('cabinet_domains') as any)
        .insert({
          cabinet_id: c.id,
          hostname,
          verification_token: verificationToken,
          created_by: owner.id,
        })
        .select('id, hostname, verification_token')
        .single()

      if (insertError) {
        console.error('[admin-cabinet-domain] insert error:', insertError.message)
        return jsonResponse({ error: 'Création impossible' }, 500)
      }

      await logAdminAction(admin, owner.id, 'add_cabinet_domain', 'organization', c.id, body.reason, {
        cabinet_name: c.name,
        hostname,
      })

      return jsonResponse({ success: true, domain: inserted })
    }

    if (body.action === 'remove') {
      if (!body.reason?.trim()) return jsonResponse({ error: 'reason requis' }, 400)
      if (!body.domain_id) return jsonResponse({ error: 'domain_id requis' }, 400)

      const { data: dom } = await admin
        .from('cabinet_domains')
        .select('id, hostname, cabinet_id')
        .eq('id', body.domain_id)
        .eq('cabinet_id', c.id)
        .maybeSingle()
      const d = dom as { id: string; hostname: string; cabinet_id: string } | null
      if (!d) return jsonResponse({ error: 'Domaine introuvable' }, 404)

      // deno-lint-ignore no-explicit-any
      const { error: deleteError } = await (admin.from('cabinet_domains') as any)
        .delete()
        .eq('id', d.id)
      if (deleteError) {
        console.error('[admin-cabinet-domain] delete error:', deleteError.message)
        return jsonResponse({ error: 'Suppression impossible' }, 500)
      }

      await logAdminAction(admin, owner.id, 'remove_cabinet_domain', 'organization', c.id, body.reason, {
        cabinet_name: c.name,
        hostname: d.hostname,
      })

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Action inconnue' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-cabinet-domain] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return 'gestu-verify-' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
