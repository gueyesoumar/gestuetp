import { createHmac } from 'node:crypto'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'

// Auth E2E ENTIÈREMENT AUTOMATIQUE (sans saisie manuelle du 2FA).
// Principe : on ne « contourne » pas la MFA, on génère le code TOTP par programme
// à partir du SECRET du compte de test (ton propre compte dédié aux tests). Le secret
// vit dans .env (gitignoré), jamais dans le dépôt. Flux GoTrue : mot de passe -> défi
// MFA -> vérification avec le code TOTP calculé -> session AAL2 -> storageState Playwright.
//
// .env requis (tools/demo-videos/.env) :
//   SUPABASE_URL=https://<ref>.supabase.co        (ou VITE_SUPABASE_URL)
//   SUPABASE_ANON_KEY=...                           (ou VITE_SUPABASE_ANON_KEY)
//   TEST_EMAIL=compte-de-test@...                   (compte DÉDIÉ aux tests)
//   TEST_PASSWORD=...
//   TEST_TOTP_SECRET=XXXX...                        (secret base32 de l'app TOTP du compte)
//   BASE_URL=https://test.gestugroup.com            (domaine stable, sans mur Vercel)
//   AUTH_FILE=.auth/state.json                      (facultatif, pour multi-rôles)

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD
const SECRET = process.env.TEST_TOTP_SECRET
const BASE = (process.env.BASE_URL || 'https://test.gestugroup.com').replace(/\/+$/, '').replace(/\/login$/, '')
const AUTH_FILE = process.env.AUTH_FILE || '.auth/state.json'

for (const [k, v] of Object.entries({ SUPABASE_URL, ANON, EMAIL, PASSWORD, SECRET })) {
  if (!v) { console.error(`❌ Variable manquante : ${k} (voir .env)`); process.exit(1) }
}

function base32Decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0, val = 0; const out = []
  for (const c of s.replace(/=+$/, '').replace(/\s/g, '').toUpperCase()) {
    const idx = A.indexOf(c); if (idx < 0) continue
    val = (val << 5) | idx; bits += 5
    if (bits >= 8) { out.push((val >> (bits - 8)) & 0xff); bits -= 8 }
  }
  return Buffer.from(out)
}
function totp(secret) {
  const key = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / 30)
  const buf = Buffer.alloc(8); buf.writeBigInt64BE(BigInt(counter))
  const h = createHmac('sha1', key).update(buf).digest()
  const o = h[h.length - 1] & 0xf
  const code = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, '0')
}

const H = { apikey: ANON, 'Content-Type': 'application/json' }
const bearer = (t) => ({ ...H, Authorization: `Bearer ${t}` })
async function j(res, ctx) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) { console.error(`❌ ${ctx} (${res.status}):`, JSON.stringify(body)); process.exit(1) }
  return body
}

// 1. Mot de passe (AAL1).
let s = await j(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: H, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}), 'connexion mot de passe')

// 2. Facteur TOTP vérifié de l'utilisateur.
const user = await j(await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: bearer(s.access_token) }), 'lecture user')
const factor = (user.factors || []).find((f) => f.status === 'verified' && f.factor_type === 'totp')
if (!factor) { console.error('❌ Aucun facteur TOTP vérifié sur ce compte.'); process.exit(1) }

// 3. Défi + vérification avec le code TOTP calculé -> session AAL2.
const ch = await j(await fetch(`${SUPABASE_URL}/auth/v1/factors/${factor.id}/challenge`, {
  method: 'POST', headers: bearer(s.access_token),
}), 'défi MFA')
s = await j(await fetch(`${SUPABASE_URL}/auth/v1/factors/${factor.id}/verify`, {
  method: 'POST', headers: bearer(s.access_token),
  body: JSON.stringify({ challenge_id: ch.id, code: totp(SECRET) }),
}), 'vérification MFA')

// 4. storageState Playwright : supabase-js v2 persiste la session sous sb-<ref>-auth-token.
if (!s.expires_at) s.expires_at = Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600)
const ref = new URL(SUPABASE_URL).host.split('.')[0]
const state = {
  cookies: [],
  origins: [{ origin: BASE, localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(s) }] }],
}
mkdirSync('.auth', { recursive: true })
writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2))
console.log(`✅ Session AAL2 écrite dans ${AUTH_FILE} (sans saisie manuelle). Lance : npm run test:e2e`)
