import { readFileSync } from 'node:fs'

// Helpers d'appel API Supabase authentifié, en dehors du navigateur (node fetch) : pas de
// préflight CORS ni d'en-tête Vercel. Utilisés par l'approche HYBRIDE (voir cabinet-journey)
// qui pilote les transitions mécaniques du workflow via les edges/RPC réels, puis assère
// l'état résultant dans l'UI. Le token est extrait du storageState Playwright d'un rôle.

const env: Record<string, string> = {}
try {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* .env absent : les tests hybrides se skipperont */ }

export const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
const ANON = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''

/** Access token d'un rôle depuis son storageState (.auth/<role>.json), ou null. */
export function tokenFrom(authFile: string): string | null {
  try {
    const s = JSON.parse(readFileSync(new URL(`../${authFile}`, import.meta.url), 'utf8'))
    for (const o of s.origins ?? []) {
      for (const kv of o.localStorage ?? []) {
        if (/auth-token/.test(kv.name)) {
          try { return JSON.parse(kv.value).access_token ?? null } catch { /* ignore */ }
        }
      }
    }
  } catch { /* fichier absent */ }
  return null
}

function headers(token: string): Record<string, string> {
  return { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

type RestResult = { status: number; body: unknown; range: string | null }

/** Requête PostgREST (rest/v1). */
export async function rest(token: string, path: string, opts: RequestInit = {}): Promise<RestResult> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { ...headers(token), ...(opts.headers as Record<string, string> ?? {}) },
  })
  let body: unknown = null
  try { body = await r.json() } catch { /* 204 */ }
  return { status: r.status, body, range: r.headers.get('content-range') }
}

/** Invoke d'Edge Function (functions/v1). */
export async function edge(token: string, name: string, payload: unknown): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(payload),
  })
  let body: unknown = null
  try { body = await r.json() } catch { /* ignore */ }
  return { status: r.status, body }
}

/** Appel RPC Postgres (rest/v1/rpc). */
export async function rpc(token: string, name: string, params: unknown): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(params),
  })
  let body: unknown = null
  try { body = await r.json() } catch { /* ignore */ }
  return { status: r.status, body }
}
