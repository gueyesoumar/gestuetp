import { defineConfig } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

// Charge tools/demo-videos/.env (gitignoré) relativement à CE fichier (CWD-indépendant) :
// BASE_URL, VERCEL_BYPASS, VITE_SUPABASE_*.
const ENV_FILE = new URL('.env', import.meta.url)
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const BASE = (process.env.BASE_URL || 'https://test.gestugroup.com').replace(/\/+$/, '').replace(/\/login$/, '')
const LOCAL_CHROME = decodeURIComponent(new URL('chrome-cft/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', import.meta.url).pathname)
const executablePath = process.env.CHROME_BIN || (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined)
const state = (f: string): string | undefined => (existsSync(f) ? f : undefined)
// Protection de déploiement Vercel : on envoie le jeton de bypass sur chaque requête.
const bypass = process.env.VERCEL_BYPASS
  ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS, 'x-vercel-set-bypass-cookie': 'true' }
  : undefined

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE,
    viewport: { width: 1280, height: 800 },
    launchOptions: executablePath ? { executablePath } : undefined,
    screenshot: 'only-on-failure',
    ...(bypass ? { extraHTTPHeaders: bypass } : {}),
  },
  projects: [
    // Régulateur admin (voit tout) : dashboards, registre, critères, modèles, simulateur, vendor.
    { name: 'regulateur', testMatch: /(risk-screens|supervision|regulateur-.*|vendor-admin.*)\.spec\.ts$/, use: { storageState: state('.auth/rega.json') } },
    // Régulateur superviseur (scoping strict par affectation).
    { name: 'superviseur', testMatch: /(scoping|superviseur-.*)\.spec\.ts$/, use: { storageState: state('.auth/regs.json') } },
    // Portail assujetti (réponses aux directives).
    { name: 'portail', testMatch: /portal-.*\.spec\.ts$/, use: { storageState: state('.auth/cli.json') } },
    // Portail candidat fournisseur (auto-évaluation).
    { name: 'vendor', testMatch: /vendor-portal.*\.spec\.ts$/, use: { storageState: state('.auth/ven.json') } },
  ],
})
