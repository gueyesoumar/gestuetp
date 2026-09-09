import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'
import { getVercelConfig, vercelAddDomain, vercelRemoveDomain } from '../_shared/vercel.ts'
import { getOvhConfig, ovhCreateRecord, ovhListRecordIds, ovhDeleteRecord, ovhRefreshZone } from '../_shared/ovh.ts'

/**
 * Edge Function : admin-cabinet-domain
 *
 * Gère les domaines custom (CNAME) d'un cabinet pour la marque blanche niveau 3,
 * avec provisionnement automatique Vercel (rattachement projet + SSL) et OVH
 * (création CNAME + TXT dans la zone gestugroup.com).
 *
 * Actions :
 *   - list       : liste les domaines du cabinet
 *   - add        : ajoute un hostname (INSERT + token) puis provisionne Vercel+OVH
 *   - reprovision: retente le provisionnement d'un domaine existant (idempotent)
 *   - remove     : deprovisionne (OVH ciblé + Vercel) puis supprime la ligne
 *
 * La vérification DNS effective reste faite par dns-verify-tenant (séparé).
 *
 * Portée : sous-domaines de gestugroup.com uniquement (OVH_ZONE). Un domaine
 * client externe n'est pas accepté pour l'instant.
 *
 * Sécurité : platform_owner uniquement, motif obligatoire, audit log,
 * validation regex stricte du hostname, garde-fous DNS dans _shared/ovh.ts.
 */

const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/
const ZONE = Deno.env.get('OVH_ZONE') ?? 'gestugroup.com'
const CNAME_TARGET = Deno.env.get('TENANT_CNAME_TARGET') ?? 'tenants.gestugroup.com'

interface ListBody { action: 'list'; cabinet_id: string }
interface AddBody { action: 'add'; cabinet_id: string; hostname: string; reason: string }
interface ReprovisionBody { action: 'reprovision'; cabinet_id: string; domain_id: string; reason: string }
interface RemoveBody { action: 'remove'; cabinet_id: string; domain_id: string; reason: string }
type Body = ListBody | AddBody | ReprovisionBody | RemoveBody

interface ProvisionState {
  vercel_registered: boolean
  dns_provisioned: boolean
  provision_error: string | null
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
        .select('id, hostname, is_verified, ssl_status, verification_token, verified_at, last_checked_at, last_error, vercel_registered, dns_provisioned, provision_error, created_at')
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
      const ins = inserted as { id: string; hostname: string; verification_token: string }

      // Provisionnement best-effort (Vercel + OVH). La ligne DB reste la source de
      // vérité ; un échec n'annule pas l'ajout (état + erreur exposés, reprovision possible).
      const prov = await provisionDomain(ins.hostname, ins.verification_token)
      // deno-lint-ignore no-explicit-any
      await (admin.from('cabinet_domains') as any).update(prov).eq('id', ins.id)

      await logAdminAction(admin, owner.id, 'add_cabinet_domain', 'organization', c.id, body.reason, {
        cabinet_name: c.name,
        hostname,
        vercel_registered: prov.vercel_registered,
        dns_provisioned: prov.dns_provisioned,
        provision_error: prov.provision_error,
      })

      return jsonResponse({ success: true, domain: { ...ins, ...prov } })
    }

    if (body.action === 'reprovision') {
      if (!body.reason?.trim()) return jsonResponse({ error: 'reason requis' }, 400)
      if (!body.domain_id) return jsonResponse({ error: 'domain_id requis' }, 400)

      const { data: dom } = await admin
        .from('cabinet_domains')
        .select('id, hostname, verification_token, cabinet_id')
        .eq('id', body.domain_id)
        .eq('cabinet_id', c.id)
        .maybeSingle()
      const d = dom as { id: string; hostname: string; verification_token: string; cabinet_id: string } | null
      if (!d) return jsonResponse({ error: 'Domaine introuvable' }, 404)

      const prov = await provisionDomain(d.hostname, d.verification_token)
      // deno-lint-ignore no-explicit-any
      await (admin.from('cabinet_domains') as any).update(prov).eq('id', d.id)

      await logAdminAction(admin, owner.id, 'reprovision_cabinet_domain', 'organization', c.id, body.reason, {
        hostname: d.hostname,
        vercel_registered: prov.vercel_registered,
        dns_provisioned: prov.dns_provisioned,
        provision_error: prov.provision_error,
      })

      return jsonResponse({ success: true, provision: prov })
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

      // Deprovision AVANT suppression : évite d'orpheliner des records DNS / Vercel
      // sans trace en base. En cas d'échec, on garde la ligne pour permettre un retry.
      try {
        await deprovisionDomain(d.hostname)
      } catch (err) {
        console.error('[admin-cabinet-domain] deprovision error:', err instanceof Error ? err.message : err)
        return jsonResponse({ error: `Deprovisionnement impossible : ${errMsg(err)}` }, 502)
      }

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

// --- Provisionnement -------------------------------------------------------

function subDomainOf(hostname: string): string {
  return hostname.slice(0, hostname.length - (`.${ZONE}`).length)
}

async function provisionDomain(hostname: string, token: string): Promise<ProvisionState> {
  const sub = subDomainOf(hostname)
  const errors: string[] = []
  let vercelRegistered = false
  let dnsProvisioned = false

  try {
    await vercelAddDomain(getVercelConfig(), hostname)
    vercelRegistered = true
  } catch (err) {
    errors.push(errMsg(err))
  }

  try {
    const ocfg = getOvhConfig()
    await ensureRecord(ocfg, 'CNAME', sub, `${CNAME_TARGET}.`)
    await ensureRecord(ocfg, 'TXT', `_gestu-verify.${sub}`, token)
    await ovhRefreshZone(ocfg)
    dnsProvisioned = true
  } catch (err) {
    errors.push(errMsg(err))
  }

  return {
    vercel_registered: vercelRegistered,
    dns_provisioned: dnsProvisioned,
    provision_error: errors.length ? errors.join(' · ') : null,
  }
}

async function deprovisionDomain(hostname: string): Promise<void> {
  const sub = subDomainOf(hostname)
  const errors: string[] = []

  try {
    const ocfg = getOvhConfig()
    for (const [type, sd] of [['CNAME', sub], ['TXT', `_gestu-verify.${sub}`]] as Array<['CNAME' | 'TXT', string]>) {
      const ids = await ovhListRecordIds(ocfg, type, sd)
      for (const id of ids) await ovhDeleteRecord(ocfg, id)
    }
    await ovhRefreshZone(ocfg)
  } catch (err) {
    errors.push(errMsg(err))
  }

  try {
    await vercelRemoveDomain(getVercelConfig(), hostname)
  } catch (err) {
    errors.push(errMsg(err))
  }

  if (errors.length) throw new Error(errors.join(' · '))
}

// Crée l'enregistrement seulement s'il n'existe pas déjà (idempotent).
async function ensureRecord(
  cfg: ReturnType<typeof getOvhConfig>,
  fieldType: 'CNAME' | 'TXT',
  subDomain: string,
  target: string,
): Promise<void> {
  const existing = await ovhListRecordIds(cfg, fieldType, subDomain)
  if (existing.length > 0) return
  await ovhCreateRecord(cfg, { fieldType, subDomain, target })
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur inconnue'
}

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
