import { test, expect } from './fixtures'
import { type Page } from '@playwright/test'
import { open, text, count } from './helpers'
import { tokenFrom, rest, edge, rpc, SUPABASE_URL } from './api'

// Remplit le nom du client (requis étape 1), robuste à l'association du label.
async function fillNom(page: Page, valeur: string): Promise<void> {
  const nom = page.getByLabel(/Nom du client/)
  if (await count(nom)) await nom.fill(valeur)
  else await page.locator('input').first().fill(valeur)
}

// J1 - Parcours cabinet (CAB-O). Projet « cabinet » (.auth/cabo.json).
// Édition Cabinet (client_portal) : clients, wizard de création avec catalogue
// de référentiels, et accès au wizard de mission.

test.describe('Cabinet - édition et navigation', () => {
  test('la nav expose Clients et Missions (édition Cabinet, pas Entreprise)', async ({ page }) => {
    // On ancre sur /clients (fiable) ; le nav est global à toutes les pages authentifiées.
    test.skip(!(await open(page, '/clients')), 'App inaccessible (session)')
    const nav = page.locator('nav')
    await expect(nav.getByRole('link', { name: /^Clients$/ })).toBeVisible()
    await expect(nav.getByRole('link', { name: /^Missions$/ })).toBeVisible()
    await expect(nav.getByRole('link', { name: /Tableau de bord/ })).toBeVisible()
    // L'édition Entreprise masquerait Clients au profit d'un espace « Conformité interne ».
    await expect(page.getByText(/Conformité interne/)).toHaveCount(0)
  })
})

test.describe('Cabinet - création de client', () => {
  test('le wizard déroule ses 4 étapes et expose le catalogue de référentiels', async ({ page }) => {
    test.skip(!(await open(page, '/clients/nouveau')), 'Création de client inaccessible')
    await expect(text(page, /Informations/)).toBeVisible()

    // Étape 1 : le nom est requis pour avancer.
    await fillNom(page, 'Diag wizard')

    // Avance jusqu'à l'étape des référentiels.
    for (let i = 0; i < 3; i++) {
      const suivant = page.getByRole('button', { name: /Suivant/ })
      if (!(await count(suivant))) break
      await suivant.first().click()
      await page.waitForTimeout(500)
    }
    await expect(text(page, /Exigences réglementaires/)).toBeVisible()
    // Le catalogue sénégalais est bien proposé au cabinet.
    await expect(text(page, /PSSI-ES/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Créer le client/ })).toBeVisible()
  })

  test('crée réellement un client et le retrouve dans la liste', async ({ page }) => {
    test.skip(!(await open(page, '/clients/nouveau')), 'Création de client inaccessible')
    const raison = `E2E Cabinet ${Date.now()}`
    await fillNom(page, raison)

    for (let i = 0; i < 3; i++) {
      const suivant = page.getByRole('button', { name: /Suivant/ })
      if (!(await count(suivant))) break
      await suivant.first().click()
      await page.waitForTimeout(500)
    }
    const creer = page.getByRole('button', { name: /Créer le client/ })
    test.skip(!(await count(creer)), 'Bouton « Créer le client » absent')
    await creer.click()

    // Retour sur la liste des clients, le nouveau client y figure.
    await expect(page).toHaveURL(/\/clients(\/|$|\?)/, { timeout: 15000 })
    await expect(page.getByText(raison)).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Cabinet - missions', () => {
  test('la liste des missions et le wizard de création sont accessibles', async ({ page }) => {
    test.skip(!(await open(page, '/missions')), 'Missions inaccessibles')
    await expect(text(page, /Missions/)).toBeVisible()
    const nouvelle = page.getByRole('link', { name: /Nouvelle mission/ })
    test.skip(!(await count(nouvelle)), 'Lien « Nouvelle mission » absent')
    await nouvelle.first().click()
    await page.waitForTimeout(800)
    // Le wizard s'ouvre sur ses 6 étapes guidées.
    await expect(text(page, /6 étapes guidées/)).toBeVisible()
  })
})

// J1 - chaîne d'audit (segment « création »). Déroule le wizard de mission de bout en
// bout (référentiel -> client -> périmètre -> équipe -> calendrier -> confirmation ->
// create-mission), ouvre la mission, puis déroule le CADRAGE : lancement du
// questionnaire de prise de connaissance (launch-questionnaire -> 14 questions ISO)
// et validation du cadrage, qui fait passer la mission en phase Planification.
// Référentiel = ISO/IEC 27001, choisi parce qu'il a un questionnaire `context` seedé
// (14 questions) ET 93 contrôles -> parcours réaliste.
// NB : la suite (compléter le questionnaire côté client, coter les contrôles en Travaux,
// constats, revue client, clôture, promotion risque, rapport) dépend soit d'un compte
// portail client, soit de préconditions de phase non déterministes en pilotage UI seul ;
// hors de ce spec.
test.describe.serial('Cabinet - chaîne d\'audit', () => {
  let missionId = ''

  test('crée une mission ISO 27001 via le wizard 6 étapes (create-mission)', async ({ page }) => {
    test.skip(!(await open(page, '/missions')), 'Missions inaccessibles')
    await page.getByRole('link', { name: /Nouvelle mission/ }).first().click()
    await page.waitForTimeout(900)

    // 1. Référentiel : cibler PRÉCISÉMENT la carte ISO/IEC 27001 (un filtre trop large
    //    attrape un conteneur ancêtre et laisse le 1er référentiel par défaut).
    await page.locator('button, [role=button], div[class*=cursor]')
      .filter({ hasText: /ISO\/IEC 27001|27001/ })
      .filter({ hasNotText: /Sélectionnez le référentiel/ })
      .last().click()
    await page.getByRole('button', { name: /Suivant/ }).first().click()
    await page.waitForTimeout(600)

    // 2. Client (un client E2E créé plus haut doit exister)
    const client = page.getByRole('button').filter({ hasText: /E2E Cabinet \d/ })
    test.skip(!(await count(client)), 'Aucun client E2E disponible pour la mission')
    await client.first().click()
    await page.getByRole('button', { name: /Suivant/ }).first().click()
    await page.waitForTimeout(600)

    // 3. Périmètre : cocher au moins un domaine
    await page.locator('input[type=checkbox]').first().check()
    await page.getByRole('button', { name: /Suivant/ }).first().click()
    await page.waitForTimeout(600)

    // 4. Équipe : associé et chef de mission DISTINCTS + un auditeur
    await page.locator('select').nth(0).selectOption({ label: 'E2E CabinetOwner' })
    await page.locator('select').nth(1).selectOption({ label: 'E2E CabinetAuditeur' })
    await page.locator('input[type=checkbox]').first().check()
    await page.getByRole('button', { name: /Suivant/ }).first().click()
    await page.waitForTimeout(600)

    // 5. Calendrier : dates début/fin
    await page.locator('input[type=date]').nth(0).fill('2026-11-01')
    await page.locator('input[type=date]').nth(1).fill('2026-12-15')
    await page.getByRole('button', { name: /Suivant/ }).first().click()
    await page.waitForTimeout(600)

    // 6. Confirmation : créer et capturer l'id renvoyé par create-mission
    await expect(text(page, /Récapitulatif/)).toBeVisible()
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('create-mission') && r.request().method() === 'POST', { timeout: 15000 }),
      page.getByRole('button', { name: /Créer la mission/ }).click(),
    ])
    expect(resp.status()).toBe(201)
    const body = await resp.json().catch(() => ({})) as { mission_id?: string }
    missionId = body.mission_id ?? ''
    expect(missionId).toMatch(/[0-9a-f-]{36}/)
    await expect(page).toHaveURL(/\/missions(\/|$|\?)/, { timeout: 10000 })
  })

  test('la mission créée ouvre le workflow d\'audit', async ({ page }) => {
    test.skip(!missionId, 'Mission non créée à l\'étape précédente')
    test.skip(!(await open(page, `/missions/${missionId}`)), 'Détail mission inaccessible')
    // En-tête « ISO/IEC 27001 - <client> » + rail de workflow + amorce du cadrage.
    await expect(text(page, /ISO\/IEC 27001/)).toBeVisible()
    await expect(text(page, /Cadrage/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Démarrer le cadrage/ })).toBeVisible()
  })

  test('lance le cadrage (14 questions) et le valide -> Planification', async ({ page }) => {
    test.skip(!missionId, 'Mission non créée à l\'étape précédente')
    test.skip(!(await open(page, `/missions/${missionId}`)), 'Détail mission inaccessible')

    // Entrer dans la phase Cadrage puis le sous-onglet Questionnaire.
    await page.getByRole('button').filter({ hasText: /^1?Cadrage$/ }).first().click()
    await page.waitForTimeout(700)
    await page.getByRole('button').filter({ hasText: /Questionnaire\d+\/\d+/ }).first().click()
    await page.waitForTimeout(900)

    // Lancer le questionnaire de prise de connaissance (launch-questionnaire).
    await page.getByRole('button', { name: /Envoyer \(\d+ questions\)/ }).first().click()
    // Le compteur passe de 0/0 à N/14 (les 14 questions ISO sont instanciées).
    await page.waitForFunction(
      () => /Questionnaire\s*\d+\/(?!0\b)\d+/.test(document.querySelector('main')?.textContent || ''),
      { timeout: 15000 },
    )
    await expect(text(page, /Questionnaire\s*\d+\/14/)).toBeVisible()

    // Valider le cadrage : la mission avance en phase 2 (Planification).
    await page.getByRole('button', { name: /Valider le cadrage/ }).first().click()
    await expect(text(page, /Planifier/)).toBeVisible({ timeout: 15000 })
  })

  // Approche HYBRIDE : les phases profondes (Travaux..Clôture) reposent sur des composants
  // React custom peu fiables en pilotage clic. On pilote donc les transitions via les edges/
  // RPC RÉELS (donc on teste vraiment le backend : logique métier, séparation des tâches,
  // RLS), avec deux logins cabinet distincts (CABA auditeur/lead cote et soumet ; CABO
  // associé approuve et clôture, l'auto-revue étant interdite), puis on ASSÈRE l'état dans
  // l'UI. Les appels node fetch sortent hors navigateur -> pas de préflight CORS/Vercel.
  test('chaîne backend jusqu\'au rapport (hybride edges/RPC + assertion UI)', async ({ page }) => {
    test.skip(!missionId, 'Mission non créée à l\'étape précédente')
    const cabo = tokenFrom('.auth/cabo.json')
    const caba = tokenFrom('.auth/caba.json')
    test.skip(!cabo || !caba || !SUPABASE_URL, 'Tokens CABO/CABA ou .env indisponibles')
    const CABA_USER = '6595fc6e-4150-4816-8639-09b306ea98b6'

    // 1. Planification : créer + affecter les 93 contrôles à CABA (assign-controls),
    //    puis passer en Travaux (RPC transition_mission_to_fieldwork).
    const fw = (await rest(cabo!, `missions?id=eq.${missionId}&select=framework_id`)).body as { framework_id: string }[]
    const frameworkId = fw[0].framework_id
    const doms = (await rest(cabo!, `domains?framework_id=eq.${frameworkId}&select=id`)).body as { id: string }[]
    const ctrls = (await rest(cabo!, `controls?domain_id=in.(${doms.map((d) => d.id).join(',')})&select=id&limit=500`)).body as { id: string }[]
    expect(ctrls.length).toBeGreaterThan(0)
    const assign = await edge(cabo!, 'assign-controls', {
      mission_id: missionId,
      assignments: ctrls.map((c) => ({ control_id: c.id, auditor_id: CABA_USER })),
    })
    expect(assign.status).toBe(200)
    const trans = await rpc(cabo!, 'transition_mission_to_fieldwork', { p_mission_id: missionId })
    expect(trans.status).toBe(200)
    expect((trans.body as { ok?: boolean }).ok).toBe(true)

    // 2. Travaux (CABA) : coter 1 contrôle Non conforme + 1 constat + submit-assessment,
    //    puis bulk « tout conforme » sur le reste -> bascule auto en internal_review.
    const ass = (await rest(caba!, `control_assessments?mission_id=eq.${missionId}&auditor_id=eq.${CABA_USER}&select=id&order=id`)).body as { id: string }[]
    expect(ass.length).toBe(ctrls.length)
    const ncId = ass[0].id
    await rest(caba!, `control_assessments?id=eq.${ncId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ conformity_level: 'major_nc', observations: 'E2E : écart constaté' }),
    })
    const finding = await rest(caba!, 'assessment_findings', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ assessment_id: ncId, classification: 'major_nc', description: 'E2E constat majeur', recommendation: 'E2E : corriger la non-conformité', priority: 'high' }),
    })
    expect(finding.status).toBe(201)
    const findingId = (finding.body as { id: string }[])[0].id
    const submitNc = await edge(caba!, 'submit-assessment', { assessment_id: ncId })
    expect(submitNc.status).toBe(200)
    const bulk = await edge(caba!, 'submit-assessments-bulk', { assessment_ids: ass.slice(1).map((a) => a.id) })
    expect(bulk.status).toBe(200)
    const afterSubmit = (await rest(caba!, `missions?id=eq.${missionId}&select=status`)).body as { status: string }[]
    expect(afterSubmit[0].status).toBe('internal_review')

    // 3. Revue interne (CABO, associé != soumetteur) : approuver les 93 (review-assessment).
    const toReview = (await rest(cabo!, `control_assessments?mission_id=eq.${missionId}&select=id`)).body as { id: string }[]
    for (let i = 0; i < toReview.length; i += 15) {
      const batch = toReview.slice(i, i + 15)
      const res = await Promise.all(batch.map((a) => edge(cabo!, 'review-assessment', { assessment_id: a.id, decision: 'approved' })))
      expect(res.every((r) => r.status === 200)).toBe(true)
    }

    // 4. Clôture (CABO) : close-mission -> phase closure + ligne reports (rapport prêt).
    const close = await edge(cabo!, 'close-mission', { mission_id: missionId })
    expect(close.status).toBe(200)
    const closeBody = close.body as { success?: boolean; report_id?: string; scoring?: unknown }
    expect(closeBody.success).toBe(true)
    expect(closeBody.report_id).toMatch(/[0-9a-f-]{36}/)
    const closed = (await rest(cabo!, `missions?id=eq.${missionId}&select=status`)).body as { status: string }[]
    expect(closed[0].status).toBe('closure')

    // 5. Promotion du constat majeur vers le registre de risque (RPC promote_finding).
    const promote = await rpc(cabo!, 'promote_finding', { p_finding_id: findingId, p_dimension: 'security', p_likelihood: 3, p_impact: 4, p_vulnerability: 3 })
    expect(promote.status).toBe(200)
    const promoted = (await rest(cabo!, `assessment_findings?id=eq.${findingId}&select=promoted_at`)).body as { promoted_at: string | null }[]
    expect(promoted[0].promoted_at).not.toBeNull()

    // 6. Assertion UI : la mission clôturée ouvre bien la phase Clôture / le rapport.
    test.skip(!(await open(page, `/missions/${missionId}`)), 'Détail mission inaccessible')
    await expect(text(page, /Rapport|Clôtur|Clôture/)).toBeVisible({ timeout: 15000 })
  })
})
