// Génère un storageState Playwright par rôle à partir des trios E2E_<ROLE>_* du .env
// (gitignoré). Réutilise auth-auto.mjs (TOTP programmatique) en sous-processus, en lui
// passant TEST_EMAIL/PASSWORD/TOTP_SECRET + AUTH_FILE par rôle. Les secrets ne sont
// jamais affichés (seul le ✅/❌ d'auth-auto remonte).
//
//   cd tools/demo-videos && node auth-multi.mjs
//
// .env attendu : variables partagées (VITE_SUPABASE_URL/ANON, BASE_URL) + par rôle :
//   E2E_REGA_EMAIL / _PASSWORD / _TOTP_SECRET  (idem REGS, CLI, VEN)
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const env = {}
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const ROLES = [['REGA', 'rega'], ['REGS', 'regs'], ['CLI', 'cli'], ['VEN', 'ven'], ['CABO', 'cabo'], ['CABA', 'caba'], ['SA', 'sa']]
let ok = 0, ko = 0
for (const [U, low] of ROLES) {
  const email = env[`E2E_${U}_EMAIL`]
  const password = env[`E2E_${U}_PASSWORD`]
  const secret = env[`E2E_${U}_TOTP_SECRET`]
  if (!email || !password || !secret) { console.error(`⏭  ${U} : trio incomplet dans .env, ignoré`); continue }
  console.log(`\n== ${U} -> .auth/${low}.json ==`)
  try {
    execFileSync('node', ['auth-auto.mjs'], {
      stdio: 'inherit',
      env: { ...process.env, ...env, TEST_EMAIL: email, TEST_PASSWORD: password, TEST_TOTP_SECRET: secret, AUTH_FILE: `.auth/${low}.json` },
    })
    ok++
  } catch { console.error(`❌ ${U} : échec (voir message ci-dessus)`); ko++ }
}
console.log(`\n--- ${ok} storageState(s) générés, ${ko} échec(s) ---`)
process.exit(ko > 0 ? 1 : 0)
