import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-cabinet-domain
 *
 * Gère les domaines custom d'un cabinet pour la marque blanche niveau 3.
 *
 * Architecture : un domaine wildcard *.gestugroup.com (SSL via délégation
 * _acme-challenge, email OVH préservé) sert TOUS les sous-domaines, et le
 * middleware edge filtre par cabinet_domains vérifié. Il n'y a donc AUCUN
 * provisionnement DNS/Vercel par domaine : ajouter un sous-domaine = insérer
 * une ligne vérifiée, que resolve-tenant-by-hostname / le middleware exposent.
 *
 * Portée : sous-domaines de gestugroup.com (couverts par le wildcard).
 *
 * Actions : list | add | remove.
 * Sécurité : platform_owner uniquement, motif obligatoire, audit log,
 * validation regex + suffixe du hostname côté serveur.
 */

const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/
const ZONE = Deno.env.get('OVH_ZONE') ?? 'gestugroup.com'

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
      if (!hostname.endsWith(`.${ZONE}`) || hostname === ZONE) {
        return jsonResponse({ error: `Seuls les sous-domaines de ${ZONE} sont acceptés` }, 400)
      }

      // Anti-collision : un hostname ne peut appartenir qu'à un seul cabinet
      const { data: existing } = await admin
        .from('cabinet_domains')
        .select('id')
        .eq('hostname', hostname)
        .maybeSingle()
      if (existing) {
        return jsonResponse({ error: 'Ce hostname est déjà utilisé' }, 409)
      }

      // Le wildcard *.gestugroup.com couvre déjà DNS + SSL : le domaine est actif
      // immédiatement (is_verified=true, ssl issued). verification_token est requis
      // par le schéma (CHECK longueur) même s'il n'est plus utilisé pour la vérif DNS.
      const now = new Date().toISOString()
      // deno-lint-ignore no-explicit-any
      const { data: inserted, error: insertError } = await (admin.from('cabinet_domains') as any)
        .insert({
          cabinet_id: c.id,
          hostname,
          verification_token: generateToken(),
          is_verified: true,
          ssl_status: 'issued',
          verified_at: now,
          last_checked_at: now,
          created_by: owner.id,
        })
        .select('id, hostname, is_verified, ssl_status, verified_at, created_at')
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
    return jsonResponse({ error: 'Erreur interne' }, 500)
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
