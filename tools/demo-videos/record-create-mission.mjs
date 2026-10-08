import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Charge la config locale .env (gitignoré) si présente, sans écraser une variable déjà
// exportée dans le shell. Évite d'avoir à préfixer BASE_URL / VERCEL_BYPASS à chaque run.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

// Enregistre une vidéo du parcours « Créer une mission » (assistant 6 étapes).
// Réutilise la session sauvegardée par `npm run auth`. Sélecteurs ancrés sur les
// titres d'étape (robustes) ; on vérifie l'avancement après chaque « Suivant » car
// le bouton reste cliquable même si l'étape est invalide.
//
// Variables d'env :
//   BASE_URL   (def. https://test.gestugroup.com)
//   SUBMIT     '=false' pour s'arrêter au récapitulatif SANS créer la mission
//              (par défaut la mission est réellement créée).

// Normalise l'origine : retire un /login ou un slash final collés par erreur (le script
// ajoute lui-même /missions), pour éviter des URLs comme .../login/missions.
const BASE = (process.env.BASE_URL || 'https://test.gestugroup.com').replace(/\/+$/, '').replace(/\/login$/, '')
const SUBMIT = process.env.SUBMIT !== 'false'

// Navigateur : CHROME_BIN s'il est défini, sinon le binaire téléchargé par
// download-chromium.sh (auto-détecté), sinon le Chromium géré par Playwright.
const LOCAL_CHROME = decodeURIComponent(new URL('chrome-cft/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', import.meta.url).pathname)
const executablePath = process.env.CHROME_BIN || (existsSync(LOCAL_CHROME) ? LOCAL_CHROME : undefined)

if (!existsSync('.auth/state.json')) {
  console.error('❌ Session absente. Lance d\'abord : npm run auth')
  process.exit(1)
}
mkdirSync('videos', { recursive: true })

const bypass = process.env.VERCEL_BYPASS

const browser = await chromium.launch({ headless: true, slowMo: 350, executablePath })
// Qualité : Playwright capture la vidéo en pixels CSS (deviceScaleFactor n'augmente PAS
// la résolution capturée — il ne fait qu'ajouter du vide autour). Pour une vidéo nette ET
// plein cadre, on agrandit le viewport lui-même : Full HD 1920×1080, capturé 1:1.
const ctx = await browser.newContext({
  storageState: '.auth/state.json',
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: 'videos', size: { width: 1920, height: 1080 } },
})
// L'enregistrement démarre ~à la création du contexte : on repère cet instant pour
// pouvoir rogner le temps mort du début (chargement + fermeture du volet démo).
const recStart = Date.now()

// Curseur synthétique : Chromium headless ne rend pas le pointeur. On injecte un rond
// doré (charte Gëstu) qui suit la souris et « pulse » à chaque clic, pour qu'on suive
// visuellement l'interaction. pointer-events:none → ne gêne aucun clic réel.
await ctx.addInitScript(() => {
  if (window.__demoCursor) return
  window.__demoCursor = true
  const mount = () => {
    if (document.getElementById('demo-cursor')) return
    const style = document.createElement('style')
    style.textContent = `
      #demo-cursor{position:fixed;top:0;left:0;width:22px;height:22px;margin:-11px 0 0 -11px;
        border:2px solid rgba(212,168,67,.95);border-radius:50%;background:rgba(212,168,67,.22);
        z-index:2147483647;pointer-events:none;transition:transform .06s linear;
        box-shadow:0 0 0 1px rgba(27,67,50,.45)}
      #demo-cursor.click{animation:democlick .45s ease-out}
      @keyframes democlick{0%{box-shadow:0 0 0 0 rgba(212,168,67,.65)}100%{box-shadow:0 0 0 26px rgba(212,168,67,0)}}
      #demo-caption{position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-6px);
        z-index:2147483646;pointer-events:none;padding:8px 16px;border-radius:9999px;
        background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;
        font:600 13px/1.2 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(27,67,50,.35);
        opacity:0;transition:opacity .3s ease,transform .3s ease}`
    document.head.appendChild(style)
    const c = document.createElement('div'); c.id = 'demo-cursor'; document.body.appendChild(c)
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)` }, true)
    addEventListener('mousedown', () => { c.classList.remove('click'); void c.offsetWidth; c.classList.add('click') }, true)
  }
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount)
})

// Contournement Vercel : n'injecter l'en-tête QUE vers l'hôte de l'app. L'appliquer à
// toutes les requêtes (extraHTTPHeaders) le collerait aussi aux appels Supabase (Edge
// Functions), déclenchant un préflight CORS que la fonction rejette → « Failed to send
// a request to the Edge Function ». On le limite donc à l'origine Vercel.
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
// Capture les erreurs console : en cas d'échec de création, la vraie raison serveur
// est loggée en console (`[toast]`, cf. useToast) et non affichée à l'utilisateur.
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
const pause = (ms = 900) => page.waitForTimeout(ms)
const next = async () => page.getByRole('button', { name: /^Suivant/ }).click()
// Légende d'étape : un bandeau flottant (haut-centre) qui nomme l'étape en cours.
const caption = (text) => page.evaluate((t) => {
  const el = document.getElementById('demo-caption') || (() => {
    const d = document.createElement('div'); d.id = 'demo-caption'; document.body.appendChild(d); return d
  })()
  el.textContent = t
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)' })
}, text).catch(() => {})
// Ramène le haut d'un titre d'étape dans le champ (défilement doux) pour les longues étapes.
const scrollToTop = () => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })).catch(() => {})
// Déplace le curseur (synthétique) sur un élément pour « accompagner » la voix off.
const hover = (loc) => loc.hover({ timeout: 4000 }).catch(() => {})
// Maintient l'écran affiché jusqu'à ce qu'il ait duré `targetMs` depuis `startTs`
// (rythme calé sur la durée de la voix off — cf. narration-creer-mission.md).
const screenHold = async (startTs, targetMs) => {
  const remaining = targetMs - (Date.now() - startTs)
  if (remaining > 0) await page.waitForTimeout(remaining)
}
// Durées cibles par écran (ms), alignées sur le script de voix off (~2:22 au total).
const T = { s0: 18000, s1: 20000, s2: 16000, s3: 24000, s4: 22000, s5: 21000, s6: 18000, outro: 4000 }
// Ferme le coach-mark (« Compris ») s'il est présent : son bouton précède les cartes
// et fausserait sinon la sélection « 1re carte après le titre ».
const dismissCoachmark = async () => {
  const btn = page.getByRole('button', { name: 'Compris' })
  if (await btn.count()) { await btn.first().click().catch(() => {}); await pause(250) }
}
// Clique la 1re carte/bouton qui suit un titre d'étape (agnostique aux classes).
const firstCardAfter = (heading) => page.getByRole('heading', { name: heading }).locator('xpath=following::button[1]')

// Sur les données de démo, un volet plein écran (« Parcours de découverte » de Doudou,
// ou l'overlay de création d'espace) peut recouvrir la page et intercepter les clics.
// On l'écarte avant d'agir : on attend la fin d'une éventuelle création, puis on ferme
// le panneau de découverte (bouton « Fermer », sinon clic sur le fond).
const dismissOverlays = async () => {
  // 1) Overlay de création d'espace : sans bouton, disparaît quand le seed se termine.
  const creating = page.getByText('Préparation de votre espace')
  if (await creating.count()) {
    await creating.first().waitFor({ state: 'detached', timeout: 60000 }).catch(() => {})
  }
  // 2) Panneau « Parcours de découverte » : ferme-le s'il est ouvert.
  const discovery = page.getByText('Parcours de découverte')
  if (await discovery.count()) {
    const close = page.getByRole('button', { name: 'Fermer' })
    if (await close.count()) await close.first().click().catch(() => {})
    else await page.mouse.click(20, 20) // clic sur le fond → onClose
    await discovery.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }
  await pause(300)
}

// Ouvre /missions en tolérant les erreurs serveur transitoires de Vercel (staging) :
// « 504 MIDDLEWARE_INVOCATION_TIMEOUT / This request timed out ». On recharge jusqu'à ce
// que la vraie page (bouton « + Nouvelle mission ») soit prête.
const gotoMissions = async () => {
  for (let i = 0; i < 5; i++) {
    await page.goto(`${BASE}/missions`, { waitUntil: 'networkidle' }).catch(() => {})
    await pause(500)
    // Session non-AAL2 : l'app bloque sur le défi 2FA → inutile d'insister.
    if (await page.getByText('Vérification en deux étapes').count()) {
      throw new Error('Session non authentifiée en 2FA (AAL2). Relance `npm run auth` sur CETTE URL, saisis le code 2FA jusqu\'à « ✅ Session sauvegardée », puis relance l\'enregistrement tout de suite.')
    }
    const errored = await page.getByText(/request timed out|MIDDLEWARE_INVOCATION_TIMEOUT/i).count()
    if (errored) { console.error(`… erreur serveur Vercel (essai ${i + 1}/5), rechargement…`); await pause(2500); continue }
    const ready = await page.locator('[data-tour="new-mission"]').first()
      .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)
    if (ready) return true
    await pause(1500)
  }
  return false
}

// Instant de coupe pour le montage final : renseigné une fois le volet démo écarté.
let introSec = 0

try {
  if (!(await gotoMissions())) {
    throw new Error('Page Missions indisponible (erreur serveur Vercel « request timed out » persistante). Réessaie dans un instant.')
  }
  await pause(700)
  await dismissOverlays()
  // La page est propre à partir d'ici : tout ce qui précède (blanc de chargement +
  // fermeture du volet démo) sera rogné au montage.
  introSec = Math.max(0, (Date.now() - recStart) / 1000 - 0.6)

  // La légende est posée JUSTE APRÈS le clic qui change d'écran (donc en même temps que
  // le nouvel écran), avant le waitFor : sinon elle accuse ~1 s de retard sur l'écran.
  // Chaque écran est maintenu `T.sN` ms (durée de sa voix off) ; le curseur survole
  // l'élément décrit avant d'agir, et le clic de transition tombe en fin de segment.

  // S0) Liste des missions — présentation, puis lancement de l'assistant.
  let t = Date.now()
  await caption('Créer une mission — en 6 étapes')
  const newBtn = page.locator('[data-tour="new-mission"]').first()
  await screenHold(t, T.s0 - 1200)
  await hover(newBtn)
  await screenHold(t, T.s0)
  await newBtn.click()

  // S1) Référentiel — on choisit PSSI-ES par son nom (robuste même avec plusieurs cartes).
  t = Date.now()
  await caption('Étape 1 — Choisir le référentiel')
  await page.getByRole('heading', { name: 'Quel référentiel ?' }).waitFor({ timeout: 15000 })
  await dismissCoachmark()
  const fwCard = page.getByRole('button', { name: /PSSI-ES/ }).first()
  await hover(fwCard)
  await screenHold(t, T.s1 - 1000)
  await fwCard.click()
  await screenHold(t, T.s1)
  await next()

  // S2) Client — Téranga Finances (nom crédible, cf. décision)
  t = Date.now()
  await caption('Étape 2 — Sélectionner le client')
  await page.getByRole('heading', { name: 'Pour quel client ?' }).waitFor({ timeout: 10000 })
  const client = page.getByRole('button', { name: /Téranga Finances/ })
  await hover(client)
  await screenHold(t, T.s2 - 1000)
  await client.click()
  await screenHold(t, T.s2)
  await next()

  // S3) Périmètre — on montre le déroulé d'un domaine puis le cocher/décocher, à deux
  // niveaux : un contrôle isolé, puis un domaine entier (le compteur réagit). On rétablit
  // tout à la fin pour rester sur un audit complet (213/213), cohérent avec la voix off.
  t = Date.now()
  await caption('Étape 3 — Périmètre & contrôles')
  await page.getByRole('heading', { name: 'Définissez le périmètre' }).waitFor({ timeout: 10000 })
  await scrollToTop()
  // a) Déplier un domaine → révèle la liste déroulante des contrôles.
  const orgBtn = page.getByRole('button', { name: 'Organisation de la sécurité des SI' })
  await hover(orgBtn); await orgBtn.click()
  await pause(1500)
  // b) Décocher puis recocher UN contrôle (1re case de la liste dépliée).
  const oneCtrl = orgBtn.locator('xpath=../following-sibling::div[1]//input[@type="checkbox"][1]')
  await hover(oneCtrl); await oneCtrl.click().catch(() => {})
  await pause(1100)
  await oneCtrl.click().catch(() => {})
  await pause(800)
  // c) Décocher puis recocher un DOMAINE entier (le compteur 213/213 chute puis remonte).
  const perBtn = page.getByRole('button', { name: 'Sécurité du personnel' })
  const perBox = perBtn.locator('xpath=preceding-sibling::input[@type="checkbox"]')
  await hover(perBox); await perBox.click().catch(() => {})
  await pause(1500)
  await perBox.click().catch(() => {})
  await pause(800)
  await screenHold(t, T.s3)
  await next()

  // S4) Équipe — associé puis chef de mission (deux personnes distinctes).
  t = Date.now()
  await caption('Étape 4 — Constituer l’équipe')
  await page.getByRole('heading', { name: /Constituez l.équipe/ }).waitFor({ timeout: 10000 })
  const assoc = page.locator('select').first()
  const lead = page.locator('select').nth(1)
  await hover(assoc)
  await assoc.selectOption({ index: 1 })
  await screenHold(t, Math.round(T.s4 / 2))
  await hover(lead)
  await lead.selectOption({ index: 2 })
  await screenHold(t, T.s4)
  await next()

  // S5) Calendrier — dates puis mise en avant de l'estimation/timeline.
  t = Date.now()
  await caption('Étape 5 — Planifier le calendrier')
  await page.getByRole('heading', { name: 'Planifiez le calendrier' }).waitFor({ timeout: 10000 })
  await hover(page.locator('#mission-start'))
  await page.fill('#mission-start', '2026-10-01')
  await hover(page.locator('#mission-end'))
  await page.fill('#mission-end', '2026-10-31')
  await hover(page.getByText('Timeline prévisionnelle').first())
  await screenHold(t, T.s5)
  await next()

  // S6) Récapitulatif — vérification puis création.
  t = Date.now()
  await caption('Étape 6 — Vérifier & créer')
  await page.getByRole('heading', { name: 'Récapitulatif' }).waitFor({ timeout: 10000 })
  await scrollToTop()
  await screenHold(t, T.s6)

  if (SUBMIT) {
    await hover(page.getByRole('button', { name: /Créer la mission/ }))
    await page.getByRole('button', { name: /Créer la mission/ }).click()
    // Succès = on quitte /nouvelle (redirection liste). Échec = un toast « Création
    // impossible » (la raison technique reste en console). On attend l'un ou l'autre.
    const outcome = await Promise.race([
      page.waitForURL((u) => !u.pathname.endsWith('/nouvelle'), { timeout: 25000 }).then(() => 'ok'),
      page.getByText('Création impossible').waitFor({ timeout: 25000 }).then(() => 'fail'),
    ]).catch(() => 'timeout')
    if (outcome === 'ok') { await caption('Mission créée ✓').catch(() => {}) }
    await pause(T.outro)
    if (outcome === 'ok') {
      console.log('✅ Mission créée — vidéo du parcours complet.')
    } else {
      console.error(`❌ La création a échoué (${outcome}).`)
      const reason = consoleErrors.filter((t) => t.includes('[toast]')).slice(-1)[0]
      if (reason) console.error('   Raison (console) :', reason)
      else if (consoleErrors.length) console.error('   Dernière erreur console :', consoleErrors.slice(-1)[0])
    }
  } else {
    console.log('ℹ️ SUBMIT=false : arrêt au récapitulatif, aucune mission créée.')
  }
} catch (err) {
  console.error('⚠️ Le parcours a calé :', err.message)
  console.error('Vérifie les prérequis (données de démo : référentiel avec contrôles, ≥1 client, ≥2 membres dont un chef éligible).')
} finally {
  const video = page.video()
  await ctx.close() // finalise la vidéo
  if (video) {
    const out = 'videos/creer-une-mission.webm'
    await video.saveAs(out)
    console.log(`🎬 Vidéo (source) : tools/demo-videos/${out}`)

    // Montage : rogne le temps mort du début et exporte un MP4 (H.264) partageable.
    // Nécessite ffmpeg ; sinon on garde le WebM brut et on l'indique.
    let hasFfmpeg = true
    try { execSync('ffmpeg -version', { stdio: 'ignore' }) } catch { hasFfmpeg = false }
    if (hasFfmpeg) {
      const mp4 = 'videos/creer-une-mission.mp4'
      const ss = introSec > 0.4 ? `-ss ${introSec.toFixed(2)} ` : ''
      try {
        // -crf 18 + preset slow : haute qualité visuelle (texte net) ; +faststart pour la
        // lecture web progressive. La source étant du 2560×1600, on garde la résolution.
        execSync(`ffmpeg -y ${ss}-i "${out}" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -an "${mp4}"`, { stdio: 'ignore' })
        console.log(`🎬 Vidéo (MP4, 1920×1080, temps mort rogné) : tools/demo-videos/${mp4}`)
      } catch { console.error('⚠️ Conversion MP4 échouée — le WebM source reste disponible.') }
    } else {
      console.log('ℹ️ ffmpeg absent : pas de MP4 rogné. `brew install ffmpeg` pour l’activer.')
    }
  }
  await browser.close()
}
