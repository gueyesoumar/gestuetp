import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { logActivity } from './audit-log.ts'

// Collecte Tenable réutilisable (RFC 0014 P1.3/P2) : appelable depuis l'edge
// utilisateur (connector-tenable) ET le dispatcher planifié (connector-dispatch).
// Prend un org_id explicite - aucune dépendance au JWT appelant.
//
// ⚠️ Le PARSING des réponses Tenable est à VALIDER sur un tenant réel ; chaque
// collecteur est isolé et tombe en 'na' en cas d'erreur, jamais en verdict trompeur.

const TENABLE_BASE = 'https://cloud.tenable.com'
const TTL_DAYS = 7 // cadence hebdomadaire (RFC 0014 §10.d)

export interface CheckResult { check_key: string; verdict: 'pass' | 'fail' | 'warn' | 'na'; value: Record<string, unknown> }

function tenableHeaders(accessKey: string, secretKey: string): HeadersInit {
  return { 'X-ApiKeys': `accessKey=${accessKey};secretKey=${secretKey}`, 'Accept': 'application/json' }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function collectNoCritical(headers: HeadersInit, params: Record<string, unknown>): Promise<CheckResult> {
  const r = await fetch(`${TENABLE_BASE}/workbenches/vulnerabilities`, { headers })
  if (!r.ok) throw new Error(`workbenches/vulnerabilities ${r.status}`)
  const data = await r.json()
  const list: Array<{ severity?: number; count?: number }> = data?.vulnerabilities ?? []
  const openCritical = list.filter((v) => v.severity === 4).reduce((s, v) => s + (v.count ?? 0), 0)
  const max = Number(params.max_open_critical ?? 0)
  return { check_key: 'tenable.no_critical_open', verdict: openCritical <= max ? 'pass' : 'fail', value: { open_critical: openCritical, threshold: max } }
}

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

function collectRemediationSlaPlaceholder(params: Record<string, unknown>): CheckResult {
  return { check_key: 'tenable.remediation_sla', verdict: 'na', value: { note: 'Collecteur à implémenter (âge de vulnérabilité, export API)', params } }
}

export interface CollectOutcome { collected: number; results: CheckResult[]; error?: string }

/** Collecte les checks Tenable pour une org et persiste les evidence_results. */
export async function collectTenableForOrg(
  admin: SupabaseClient,
  orgId: string,
  actorUserId: string | null,
): Promise<CollectOutcome> {
  const { data: integ } = await admin
    .from('connector_integrations').select('secret_ref, status')
    .eq('organization_id', orgId).eq('provider', 'tenable').maybeSingle()
  if (!integ || integ.status !== 'active' || !integ.secret_ref) return { collected: 0, results: [], error: 'no_active_integration' }

  const { data: creds } = await admin.rpc('connector_secret_read', { p_secret_ref: integ.secret_ref })
  if (!creds?.accessKey || !creds?.secretKey) return { collected: 0, results: [], error: 'no_credentials' }
  const headers = tenableHeaders(String(creds.accessKey), String(creds.secretKey))

  const { data: checkRows } = await admin.from('control_checks').select('id, check_key, default_params').eq('provider', 'tenable')
  const byKey = new Map((checkRows ?? []).map((c: { id: string; check_key: string; default_params: Record<string, unknown> }) => [c.check_key, c]))

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
      console.error('[tenable-collect]', msg)
      results.push({ check_key: 'tenable.error', verdict: 'na', value: { error: msg } })
    }
  }

  const now = new Date()
  const expires = new Date(now.getTime() + TTL_DAYS * 86400 * 1000).toISOString()
  let collected = 0
  for (const res of results) {
    const check = byKey.get(res.check_key)
    if (!check) continue
    const hash = await sha256Hex(JSON.stringify({ k: res.check_key, v: res.value, t: now.toISOString() }))
    const { error: insErr } = await admin.from('evidence_results').insert({
      organization_id: orgId, check_id: check.id, control_id: null, mission_id: null,
      verdict: res.verdict, value: res.value, collected_at: now.toISOString(), expires_at: expires, hash,
    })
    if (insErr) { console.error('[tenable-collect] insert:', insErr.message); continue }
    collected++
    await logActivity(admin, {
      organizationId: orgId, actorUserId, action: 'evidence.collected',
      targetType: 'control_check', targetId: check.id, targetLabel: res.check_key,
      summary: `Preuve Tenable collectée : ${res.check_key} → ${res.verdict}`,
      metadata: { verdict: res.verdict, hash },
    })
  }

  await admin.from('connector_integrations').update({ last_sync_at: now.toISOString() })
    .eq('organization_id', orgId).eq('provider', 'tenable')

  return { collected, results }
}
