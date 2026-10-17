import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// E2E read-only des modules Risk / Regul. Réutilise la session sauvegardée par
// `npm run auth` (.auth/state.json, qui porte aussi le cookie de bypass Vercel).
const BASE = (process.env.BASE_URL || 'https://test.gestugroup.com').replace(/\/+$/, '').replace(/\/login$/, '')
const LOCAL_CHROME = decodeURIComponent(new URL('chrome-cft/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', import.meta.url).pathname)
const executablePath = process.env.CHROME_BIN || (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined)

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    storageState: existsSync('.auth/state.json') ? '.auth/state.json' : undefined,
    viewport: { width: 1280, height: 800 },
    launchOptions: executablePath ? { executablePath } : undefined,
    screenshot: 'only-on-failure',
  },
})
