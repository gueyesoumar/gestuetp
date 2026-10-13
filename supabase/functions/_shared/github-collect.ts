import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { logActivity } from './audit-log.ts'

// Collecte GitHub réutilisable (RFC 0014 P3) : org-level, 3 checks dérivés d'un
// seul GET /orgs/{org}. Appelable depuis l'edge utilisateur (connector-github) ET
// le dispatcher planifié. Prend un org_id (interne) explicite - pas de JWT requis.
//
// ⚠️ Les 3 flags org GitHub (two_factor_requirement_enabled, *_for_new_repositories)
// ne sont renvoyés QUE si le token a les droits owner → sinon null => verdict 'na'.

const GH_BASE = 'https://api.github.com'
const TTL_DAYS = 7

function ghHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'gestu-etp-connector',
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface CheckResult { check_key: string; verdict: 'pass' | 'fail' | 'warn' | 'na'; value: Record<string, unknown> }

function boolCheck(key: string, flag: unknown, trueIsPass = true): CheckResult {
  if (typeof flag !== 'boolean') return { check_key: key, verdict: 'na', value: { note: 'Flag indisponible (droits owner requis)' } }
  const ok = trueIsPass ? flag : !flag
  return { check_key: key, verdict: ok ? 'pass' : 'fail', value: { enabled: flag } }
}

export interface CollectOutcome { collected: number; results: CheckResult[]; error?: string }

export async function collectGithubForOrg(admin: SupabaseClient, orgId: string, actorUserId: string | null): Promise<CollectOutcome> {
  const { data: integ } = await admin
    .from('connector_integrations').select('secret_ref, status, external_account')
    .eq('organization_id', orgId).eq('provider', 'github').maybeSingle()
  if (!integ || integ.status !== 'active' || !integ.secret_ref) return { collected: 0, results: [], error: 'no_active_integration' }
  const login = integ.external_account
  if (!login) return { collected: 0, results: [], error: 'no_org_login' }

  const { data: creds } = await admin.rpc('connector_secret_read', { p_secret_ref: integ.secret_ref })
  if (!creds?.token) return { collected: 0, results: [], error: 'no_credentials' }

  const results: CheckResult[] = []
  try {
    const r = await fetch(`${GH_BASE}/orgs/${encodeURIComponent(String(login))}`, { headers: ghHeaders(String(creds.token)) })
    if (!r.ok) throw new Error(`orgs/${login} ${r.status}`)
    const org = await r.json()
    results.push(boolCheck('github.org_2fa_required', org?.two_factor_requirement_enabled))
    results.push(boolCheck('github.dependabot_alerts', org?.dependabot_alerts_enabled_for_new_repositories))
    results.push(boolCheck('github.secret_scanning', org?.secret_scanning_enabled_for_new_repositories))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[github-collect]', msg)
    return { collected: 0, results: [{ check_key: 'github.error', verdict: 'na', value: { error: msg } }], error: 'fetch_failed' }
  }

  const { data: checkRows } = await admin.from('control_checks').select('id, check_key').eq('provider', 'github')
  const byKey = new Map((checkRows ?? []).map((c: { id: string; check_key: string }) => [c.check_key, c.id]))

  const now = new Date()
  const expires = new Date(now.getTime() + TTL_DAYS * 86400 * 1000).toISOString()
  let collected = 0
  for (const res of results) {
    const checkId = byKey.get(res.check_key)
    if (!checkId) continue
    const hash = await sha256Hex(JSON.stringify({ k: res.check_key, v: res.value, t: now.toISOString() }))
    const { error: insErr } = await admin.from('evidence_results').insert({
      organization_id: orgId, check_id: checkId, control_id: null, mission_id: null,
      verdict: res.verdict, value: res.value, collected_at: now.toISOString(), expires_at: expires, hash,
    })
    if (insErr) { console.error('[github-collect] insert:', insErr.message); continue }
    collected++
    await logActivity(admin, {
      organizationId: orgId, actorUserId, action: 'evidence.collected',
      targetType: 'control_check', targetId: checkId, targetLabel: res.check_key,
      summary: `Preuve GitHub collectée : ${res.check_key} → ${res.verdict}`, metadata: { verdict: res.verdict, hash },
    })
  }

  await admin.from('connector_integrations').update({ last_sync_at: now.toISOString() })
    .eq('organization_id', orgId).eq('provider', 'github')

  return { collected, results }
}
