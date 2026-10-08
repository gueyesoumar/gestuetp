import { chromium } from '@playwright/test'
import { mkdirSync, existsSync, readFileSync } from 'node:fs'

// Charge la config locale .env (gitignoré) si présente, sans écraser une variable déjà
// exportée dans le shell (BASE_URL, VERCEL_BYPASS).
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

// Navigateur : CHROME_BIN s'il est défini, sinon le binaire téléchargé par
// download-chromium.sh (auto-détecté), sinon le Chromium géré par Playwright.
const LOCAL_CHROME = decodeURIComponent(new URL('chrome-cft/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', import.meta.url).pathname)
const executablePath = process.env.CHROME_BIN || (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined)

// Connexion MANUELLE une seule fois : ouvre un vrai navigateur, tu te connectes
// (email + mot de passe + code 2FA) toi-même, puis la session est sauvegardée dans
// .auth/state.json et réutilisée par les scripts d'enregistrement. Aucun secret
// (mot de passe, secret TOTP) n'est stocké dans le repo — seul un jeton de session
// l'est, dans .auth/ (gitignoré). Ne partage pas ce fichier.

// Normalise l'origine : on retire un éventuel /login et le slash final collés par erreur
// (le script ajoute lui-même /login), pour éviter des URLs comme .../login/login.
const BASE = (process.env.BASE_URL || 'https://test.gestugroup.com').replace(/\/+$/, '').replace(/\/login$/, '')

// Contourne le mur de protection Vercel (staging) sans passer par Google OAuth :
// renseigne VERCEL_BYPASS avec le secret « Protection Bypass for Automation ».
const bypass = process.env.VERCEL_BYPASS

const browser = await chromium.launch({ headless: false, executablePath })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })

// Injecter l'en-tête de bypass UNIQUEMENT vers l'hôte de l'app (pas vers Supabase,
// dont les Edge Functions rejetteraient le préflight CORS induit). `set-bypass-cookie`
// pose en plus un cookie sauvegardé dans storageState, réutilisé ensuite sans en-tête.
if (bypass) {
  const appHost = new URL(BASE).host
  await ctx.route('**/*', async (route) => {
    const req = route.request()
    if (new URL(req.url()).host === appHost) {
      await route.continue({ headers: { ...req.headers(), 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } })
    } else {
      await route.continue()
    }
  })
}
const page = await ctx.newPage()

await page.goto(`${BASE}/login`)
console.log('\n👉 Connecte-toi dans la fenêtre (email + mot de passe + code 2FA). J\'attends jusqu\'à 5 min…\n')

// Attend que la session soit authentifiée (AAL2) : plus sur /login et plus de défi 2FA.
await page.waitForFunction(() => {
  const onLogin = location.pathname.startsWith('/login')
  const mfa = document.body.innerText.includes('Vérification en deux étapes')
  return !onLogin && !mfa
}, { timeout: 300000 })

await page.waitForTimeout(1500)
mkdirSync('.auth', { recursive: true })
await ctx.storageState({ path: '.auth/state.json' })
console.log('✅ Session sauvegardée dans .auth/state.json — tu peux lancer les enregistrements.')
await browser.close()
