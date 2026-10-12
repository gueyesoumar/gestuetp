import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'

// Connecteur Tenable Vulnerability Management (cloud, ex-Tenable.io) — RFC 0014 P1.3.
// Auth Tenable = clés d'API PAR ORG (header X-ApiKeys). Les clés vivent en Vault
// (connector_secret_store/read). Deux actions : `connect` (valide + stocke) et
// `collect` (lit les clés, interroge Tenable, écrit des evidence_results).
//
// ⚠️ Le PARSING des réponses Tenable (champs exacts) est à VALIDER sur un tenant
// réel ; chaque collecteur est isolé et tombe en 'na' en cas d'erreur, jamais en
// verdict trompeur.

const TENABLE_BASE = 'https://cloud.tenable.com'
const TTL_DAYS = 7 // cadence hebdomadaire (RFC 0014 §10.d)

function tenableHeaders(accessKey: string, secretKey: string): HeadersInit {
  return { 'X-ApiKeys': `accessKey=${accessKey};secretKey=${secretKey}`, 'Accept': 'application/json' }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface CheckResult { check_key: string; verdict: 'pass' | 'fail' | 'warn' | 'na'; value: Record<string, unknown> }

// Vulnérabilités critiques ouvertes. /workbenches/vulnerabilities agrège par plugin
// avec un niveau `severity` (4 = critique) et un `count`. [parsing à valider]
async function collectNoCritical(headers: HeadersInit, params: Record<string, unknown>): Promise<CheckResult> {
  const r = await fetch(`${TENABLE_BASE}/workbenches/vulnerabilities`, { headers })
  if (!r.ok) throw new Error(`workbenches/vulnerabilities ${r.status}`)
  const data = await r.json()
  const list: Array<{ severity?: number; count?: number }> = data?.vulnerabilities ?? []
  const openCritical = list.filter((v) => v.severity === 4).reduce((s, v) => s + (v.count ?? 0), 0)
  const max = Number(params.max_open_critical ?? 0)
  return { check_key: 'tenable.no_critical_open', verdict: openCritical <= max ? 'pass' : 'fail', value: { open_critical: openCritical, threshold: max } }
}

// Couverture / fraîcheur des scans. /scans liste les scans avec last_modification_date
// (epoch secondes). On prend le plus récent. [parsing à valider]
async function collectScanCoverage(headers: HeadersInit, params: Record<string, unknown>): Promise<CheckResult> {
  const r = await fetch(`${TENABLE_BASE}/scans`, { headers })
  if (!r.ok) throw new Error(`scans ${r.status}`)
  const data = await r.json()
  const scans: Array<{ last_modification_date?: number }> = data?.scans ?? []
  const lastTs = scans.reduce((m, s) => Math.max(m, Number(s.last_modification_date ?? 0)), 0)
  const ageDays = lastTs > 0 ? (Date.now() / 1000 - lastTs) / 86400 : Infinity
  const maxAge = Number(params.max_scan_age_days ?? 30)
  const fresh = Number.isFinite(ageDays) && ageDays <= maxAge
  return {
    check_key: 'tenable.scan_coverage',
    verdict: fresh ? 'pass' : 'warn',
    value: { last_scan_age_days: Number.isFinite(ageDays) ? Math.round(ageDays) : null, max_scan_age_days: maxAge },
  }
}

// SLA de remédiation : nécessite l'âge PAR vulnérabilité (export API /vulns/export,
// asynchrone). Laissé en 'na' tant que non validé sur un tenant réel — on ne produit
// pas un verdict trompeur. À implémenter en P1.3bis.
function collectRemediationSlaPlaceholder(params: Record<string, unknown>): CheckResult {
  return { check_key: 'tenable.remediation_sla', verdict: 'na', value: { note: 'Collecteur à implémenter (âge de vulnérabilité, export API)', params } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Identité de l'appelant (JWT vérifié ; aucun fallback header).
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')
    let callerId: string | null = null
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
      callerId = user?.id ?? null
    }
    if (!callerId) return json({ error: 'Non autorisé' }, 401)

    const { data: profile } = await supabaseAdmin.from('users').select('id, organization_id').eq('auth_id', callerId).single()
    if (!profile) return json({ error: 'Profil introuvable' }, 403)
    const orgId: string = profile.organization_id

    // 2. Gate : le module Conformité continue doit être actif pour l'org.
    const { data: cap } = await supabaseAdmin
      .from('organization_capabilities')
      .select('capability')
      .eq('org_id', orgId).eq('capability', 'continuous_compliance').eq('status', 'active')
      .maybeSingle()
    if (!cap) return json({ error: 'Module Conformité continue non activé' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = body?.action

    // ───────────────────── CONNECT ─────────────────────
    if (action === 'connect') {
      const accessKey = String(body.accessKey ?? '').trim()
      const secretKey = String(body.secretKey ?? '').trim()
      if (!accessKey || !secretKey) return json({ error: 'Clés d\'API requises' }, 400)

      // Validation : un appel test authentifié.
      const test = await fetch(`${TENABLE_BASE}/session`, { headers: tenableHeaders(accessKey, secretKey) })
      if (!test.ok) return json({ error: 'Clés Tenable invalides ou API inaccessible' }, 400)

      const { data: secretRef, error: vErr } = await supabaseAdmin.rpc('connector_secret_store', {
        p_org: orgId, p_provider: 'tenable', p_payload: { accessKey, secretKey },
      })
      if (vErr || !secretRef) { console.error('[connector-tenable] vault:', vErr?.message); return json({ error: 'Stockage sécurisé impossible' }, 500) }

      const { error: upErr } = await supabaseAdmin.from('connector_integrations').upsert({
        organization_id: orgId, provider: 'tenable', status: 'active',
        scopes: ['vuln:read', 'scans:read'], secret_ref: secretRef,
        external_account: 'cloud.tenable.com', connected_by: profile.id,
        connected_at: new Date().toISOString(), last_error: null,
      }, { onConflict: 'organization_id,provider' })
      if (upErr) { console.error('[connector-tenable] integration:', upErr.message); return json({ error: 'Enregistrement impossible' }, 500) }

      await logActivity(supabaseAdmin, {
        organizationId: orgId, actorUserId: profile.id, action: 'connector.connected',
        targetType: 'connector', targetLabel: 'Tenable', summary: 'Connecteur Tenable connecté',
      })
      return json({ ok: true })
    }

    // ───────────────────── COLLECT ─────────────────────
    if (action === 'collect') {
      const { data: integ } = await supabaseAdmin
        .from('connector_integrations')
        .select('secret_ref, status')
        .eq('organization_id', orgId).eq('provider', 'tenable').maybeSingle()
      if (!integ || integ.status !== 'active' || !integ.secret_ref) return json({ error: 'Aucune connexion Tenable active' }, 400)

      const { data: creds } = await supabaseAdmin.rpc('connector_secret_read', { p_secret_ref: integ.secret_ref })
      if (!creds?.accessKey || !creds?.secretKey) return json({ error: 'Identifiants introuvables' }, 500)
      const headers = tenableHeaders(String(creds.accessKey), String(creds.secretKey))

      const { data: checks } = await supabaseAdmin.from('control_checks').select('id, check_key, default_params').eq('provider', 'tenable')
      const byKey = new Map((checks ?? []).map((c: { id: string; check_key: string; default_params: Record<string, unknown> }) => [c.check_key, c]))

      // Exécution isolée : une erreur sur un check ne casse pas les autres (→ 'na').
      const planned: Array<() => Promise<CheckResult>> = [
        () => collectNoCritical(headers, byKey.get('tenable.no_critical_open')?.default_params ?? {}),
        () => collectScanCoverage(headers, byKey.get('tenable.scan_coverage')?.default_params ?? {}),
        () => Promise.resolve(collectRemediationSlaPlaceholder(byKey.get('tenable.remediation_sla')?.default_params ?? {})),
      ]
      const results: CheckResult[] = []
      for (const run of planned) {
        try { results.push(await run()) }
        catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error('[connector-tenable] collect:', msg)
          results.push({ check_key: 'tenable.error', verdict: 'na', value: { error: msg } })
        }
      }

      // Persistance : un evidence_results par check (control_id null → signal org-level ;
      // la liaison aux contrôles via control_check_links + génération de constat = P2).
      const now = new Date()
      const expires = new Date(now.getTime() + TTL_DAYS * 86400 * 1000).toISOString()
      let persisted = 0
      for (const res of results) {
        const check = byKey.get(res.check_key)
        if (!check) continue // 'tenable.error' sans check mappé → ignoré en base
        const hash = await sha256Hex(JSON.stringify({ k: res.check_key, v: res.value, t: now.toISOString() }))
        const { error: insErr } = await supabaseAdmin.from('evidence_results').insert({
          organization_id: orgId, check_id: check.id, control_id: null, mission_id: body.mission_id ?? null,
          verdict: res.verdict, value: res.value, collected_at: now.toISOString(), expires_at: expires, hash,
        })
        if (insErr) { console.error('[connector-tenable] insert:', insErr.message); continue }
        persisted++
        await logActivity(supabaseAdmin, {
          organizationId: orgId, actorUserId: profile.id, action: 'evidence.collected',
          targetType: 'control_check', targetId: check.id, targetLabel: res.check_key,
          summary: `Preuve Tenable collectée : ${res.check_key} → ${res.verdict}`,
          metadata: { verdict: res.verdict, hash },
        })
      }

      await supabaseAdmin.from('connector_integrations')
        .update({ last_sync_at: now.toISOString() })
        .eq('organization_id', orgId).eq('provider', 'tenable')

      return json({ ok: true, collected: persisted, results })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('[connector-tenable]', err instanceof Error ? err.message : String(err))
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
