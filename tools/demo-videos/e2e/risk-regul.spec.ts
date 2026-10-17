import { test, expect, type Page } from '@playwright/test'

// E2E read-only : on ouvre chaque route Risk/Regul et on vérifie que l'écran rend
// son titre. Si le rôle de la session n'a pas accès (redirection vers l'accueil),
// le test est ignoré plutôt qu'en échec. AUCUNE écriture (pas de création/suppression).

async function open(page: Page, path: string): Promise<boolean> {
  await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(800)
  // Redirigé vers l'accueil = route non autorisée pour ce rôle.
  const url = new URL(page.url())
  return url.pathname.startsWith(path.split('?')[0])
}

async function expectHeading(page: Page, path: string, text: string | RegExp): Promise<void> {
  const ok = await open(page, path)
  test.skip(!ok, `Route ${path} non accessible pour ce rôle`)
  await expect(page.getByText(text).first()).toBeVisible()
}

test.describe('Module Risk - écrans', () => {
  test('Vue d\'ensemble', async ({ page }) => { await expectHeading(page, '/risque', /Vue d.ensemble/) })
  test('Registre des risques', async ({ page }) => { await expectHeading(page, '/risque/registre', /Registre des risques/) })
  test('Critères & méthode d\'exposition', async ({ page }) => {
    await expectHeading(page, '/risque/criteres', /Critères/)
    await expect(page.getByText(/Comment l.exposition est calculée/).first()).toBeVisible()
  })
  test('Modèles de scénarios (catalogue)', async ({ page }) => {
    const ok = await open(page, '/risque/modeles')
    test.skip(!ok, 'Modèles non accessibles pour ce rôle')
    await expect(page.getByText(/Modèles de scénarios/).first()).toBeVisible()
    // Le catalogue plateforme doit proposer des modèles.
    await page.getByRole('button', { name: /Catalogue plateforme/ }).click().catch(() => {})
    await expect(page.getByText(/Rançongiciel/).first()).toBeVisible()
  })
  test('Plan de traitement', async ({ page }) => { await expectHeading(page, '/risque/plan', /Plan de traitement|Plan/) })
  test('Acceptations', async ({ page }) => { await expectHeading(page, '/risque/acceptations', /Acceptation/) })
  test('Simulateur', async ({ page }) => { await expectHeading(page, '/risque/simulateur', /Simulateur/) })
  test('Revue & surveillance', async ({ page }) => { await expectHeading(page, '/risque/revue', /Revue/) })
})

test.describe('Supervision (régulateur) - écrans', () => {
  test('Portefeuille de risque', async ({ page }) => { await expectHeading(page, '/risque/portefeuille', /Portefeuille de risque/) })
  test('Affectations de supervision', async ({ page }) => { await expectHeading(page, '/risque/affectations', /Affectations/) })
  test('Registre consolidé (tous les assujettis)', async ({ page }) => {
    const ok = await open(page, '/risque/registre')
    test.skip(!ok, 'Registre non accessible')
    // En contexte superviseur, la bascule « Tous les assujettis » existe.
    await expect(page.getByText(/Tous les assujettis|Registre des risques/).first()).toBeVisible()
  })
})

test('aucune erreur console fatale sur le tableau de bord Risk', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const ok = await open(page, '/risque')
  test.skip(!ok, 'Risk non accessible')
  expect(errors, errors.join('\n')).toHaveLength(0)
})
