import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : dns-verify-tenant
 *
 * Vérifie qu'un domaine custom satisfait à 2 conditions DNS :
 *   1. CNAME du hostname pointe vers tenants.gestugroup.com (ou la cible Vercel)
 *   2. TXT de _gestu-verify.<hostname> contient le verification_token attendu
 *
 * Si tout est OK → marque is_verified = true, ssl_status = 'issued' (Vercel
 * émet le SSL automatiquement après l'add-domain côté infra).
 *
 * Utilise Cloudflare DNS-over-HTTPS (https://cloudflare-dns.com/dns-query)
 * qui ne nécessite ni clé ni installation : 1.1.1.1 résolveur public.
 *
 * Sécurité : platform_owner uniquement, motif obligatoire, audit log,
 * timeout fetch 5s pour éviter blocage. Re-vérification possible à tout moment.
 */

const EXPECTED_CNAME_TARGET = Deno.env.get('TENANT_CNAME_TARGET') ?? 'tenants.gestugroup.com'
const DOH_URL = 'https://cloudflare-dns.com/dns-query'
const DNS_TIMEOUT_MS = 5_000

interface VerifyBody { action: 'verify'; cabinet_id: string; domain_id: string; reason: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as VerifyBody
    if (body.action !== 'verify' || !body.domain_id || !body.cabinet_id || !body.reason?.trim()) {
      return jsonResponse({ error: 'action, cabinet_id, domain_id, reason requis' }, 400)
    }

    const { data: dom } = await admin
      .from('cabinet_domains')
      .select('id, hostname, cabinet_id, verification_token, is_verified')
      .eq('id', body.domain_id)
      .eq('cabinet_id', body.cabinet_id)
      .single()
    if (!dom) return jsonResponse({ error: 'Domaine introuvable' }, 404)
    const d = dom as { id: string; hostname: string; cabinet_id: string; verification_token: string; is_verified: boolean }

    const checks = await runDnsChecks(d.hostname, d.verification_token)

    const allOk = checks.cname.ok && checks.txt.ok
    const updatePayload: Record<string, unknown> = {
      is_verified: allOk,
      last_checked_at: new Date().toISOString(),
      last_error: allOk ? null : buildErrorMessage(checks),
    }
    if (allOk) {
      updatePayload.verified_at = new Date().toISOString()
      updatePayload.ssl_status = 'issued'
    }

    // deno-lint-ignore no-explicit-any
    const { error: updateError } = await (admin.from('cabinet_domains') as any)
      .update(updatePayload)
      .eq('id', d.id)
    if (updateError) {
      console.error('[dns-verify-tenant] update error:', updateError.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }

    await logAdminAction(admin, owner.id, 'verify_cabinet_domain', 'organization', d.cabinet_id, body.reason, {
      hostname: d.hostname,
      cname_ok: checks.cname.ok,
      cname_observed: checks.cname.observed,
      txt_ok: checks.txt.ok,
      txt_observed_count: checks.txt.observed.length,
      result_verified: allOk,
    })

    return jsonResponse({
      success: true,
      verified: allOk,
      checks,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[dns-verify-tenant] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

interface DnsCheck { ok: boolean; observed: string[] }

async function runDnsChecks(hostname: string, token: string): Promise<{ cname: { ok: boolean; observed: string }; txt: DnsCheck }> {
  const [cnameResult, txtResult] = await Promise.all([
    queryDns(hostname, 'CNAME'),
    queryDns(`_gestu-verify.${hostname}`, 'TXT'),
  ])

  // CNAME : on attend un record qui ressemble à EXPECTED_CNAME_TARGET (avec ou sans trailing dot)
  const cnameObserved = cnameResult.length > 0 ? normalizeDns(cnameResult[0]) : ''
  const cnameOk = cnameObserved.endsWith(normalizeDns(EXPECTED_CNAME_TARGET))

  // TXT : Cloudflare retourne les records entre guillemets
  const txtObserved = txtResult.map((r) => r.replace(/^"(.*)"$/, '$1'))
  const txtOk = txtObserved.some((r) => r === token)

  return {
    cname: { ok: cnameOk, observed: cnameObserved },
    txt: { ok: txtOk, observed: txtObserved },
  }
}

async function queryDns(name: string, type: 'CNAME' | 'TXT'): Promise<string[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS)
  try {
    const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`
    const res = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: controller.signal,
    })
    if (!res.ok) return []
    const json = await res.json() as { Answer?: Array<{ data: string; type: number }> }
    return (json.Answer ?? []).map((a) => a.data)
  } catch (err) {
    console.warn(`[dns-verify-tenant] ${type} ${name} échec:`, err instanceof Error ? err.message : err)
    return []
  } finally {
    clearTimeout(timer)
  }
}

function normalizeDns(value: string): string {
  return value.toLowerCase().replace(/\.$/, '')
}

function buildErrorMessage(checks: { cname: { ok: boolean; observed: string }; txt: DnsCheck }): string {
  const errors: string[] = []
  if (!checks.cname.ok) {
    errors.push(`CNAME ne pointe pas vers ${EXPECTED_CNAME_TARGET} (observé : ${checks.cname.observed || 'aucune réponse'})`)
  }
  if (!checks.txt.ok) {
    errors.push('Token de vérification absent du TXT _gestu-verify')
  }
  return errors.join(' · ')
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
