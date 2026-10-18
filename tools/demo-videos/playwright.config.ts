import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// E2E read-only Risk / Regul, multi-rôles. Chaque projet réutilise la session d'un
// rôle (sauvegardée par `npm run auth:auto` avec AUTH_FILE) :
//   .auth/state.json  -> régulateur / staff
//   .auth/client.json -> assujetti portail (facultatif)
// Un projet dont la session manque tourne sans auth : l'app redirige vers /login et
// les tests se mettent en skip (via le helper open()). Aucune écriture.
const BASE = (process.env.BASE_URL || 'https://test.gestugroup.com').replace(/\/+$/, '').replace(/\/login$/, '')
const LOCAL_CHROME = decodeURIComponent(new URL('chrome-cft/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', import.meta.url).pathname)
const executablePath = process.env.CHROME_BIN || (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined)
const state = (f: string): string | undefined => (existsSync(f) ? f : undefined)

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
  },
  projects: [
    { name: 'regulateur', testMatch: /(risk-screens|supervision)\.spec\.ts$/, use: { storageState: state('.auth/state.json') } },
    { name: 'portail', testMatch: /portal-.*\.spec\.ts$/, use: { storageState: state('.auth/client.json') } },
  ],
})
