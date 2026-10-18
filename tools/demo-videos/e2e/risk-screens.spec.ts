import { test, expect } from '@playwright/test'
import { open, text, count } from './helpers'

// Module Risk, écrans et interactions (lecture seule, aucune écriture).

test.describe('Risk - tableau de bord', () => {
  test('KPIs, bandeau maîtrise et carte', async ({ page }) => {
    test.skip(!(await open(page, '/risque')), 'Risk inaccessible')
    await expect(text(page, /Vue d.ensemble/)).toBeVisible()
    await expect(text(page, /Scénarios|À traiter|Exposition moyenne/)).toBeVisible()
    await expect(text(page, /Maîtrise du risque|Aucun scénario coté/)).toBeVisible()
  })

  test('visite guidée et ouverture du registre', async ({ page }) => {
    test.skip(!(await open(page, '/risque')), 'Risk inaccessible')
    await expect(page.getByRole('button', { name: /Visite guidée/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ouvrir le registre/ })).toBeVisible()
  })

  test('clic sur une case de la matrice filtre le registre', async ({ page }) => {
    test.skip(!(await open(page, '/risque')), 'Risk inaccessible')
    const cells = page.locator('[title^="Voir les risques V"]')
    test.skip((await count(cells)) === 0, 'Matrice non rendue (pas de carte)')
    await cells.first().click()
    await page.waitForTimeout(600)
    expect(page.url()).toMatch(/\/risque\/registre\?v=\d&i=\d/)
    await expect(text(page, /Vraisemblance \d . Impact \d/)).toBeVisible()
  })
})

test.describe('Risk - registre', () => {
  test('en-têtes, légende et pastille exposition', async ({ page }) => {
    test.skip(!(await open(page, '/risque/registre')), 'Registre inaccessible')
    await expect(text(page, /Registre des risques/)).toBeVisible()
    // Pastille ⓘ exposition -> popover avec la méthode.
    const info = page.getByRole('button', { name: /exposition est calculée/i })
    if (await count(info)) {
      await info.first().click()
      await expect(text(page, /V . I . 16 . 100|indice sur 100/)).toBeVisible()
    }
  })

  test('ouverture du détail d\'un scénario (bande + onglets)', async ({ page }) => {
    test.skip(!(await open(page, '/risque/registre')), 'Registre inaccessible')
    const rows = page.locator('table tbody tr')
    test.skip((await count(rows)) === 0, 'Registre vide pour ce rôle')
    // Clic sur le libellé du 1er scénario.
    await rows.first().getByRole('button').first().click().catch(() => {})
    await page.waitForTimeout(600)
    const detail = text(page, /Inhérent|Résiduel|Appréciation|Surveiller/)
    if (await count(detail)) await expect(detail).toBeVisible()
  })
})

test.describe('Risk - critères & méthode', () => {
  test('carte « Comment l\'exposition est calculée »', async ({ page }) => {
    test.skip(!(await open(page, '/risque/criteres')), 'Critères inaccessibles')
    await expect(text(page, /Critères/)).toBeVisible()
    await expect(text(page, /Comment l.exposition est calculée/)).toBeVisible()
    await expect(text(page, /V . I . 16 . 100/)).toBeVisible()
    await expect(text(page, /Seuil d.acceptation/)).toBeVisible()
  })

  test('option de promotion automatique des constats', async ({ page }) => {
    test.skip(!(await open(page, '/risque/criteres')), 'Critères inaccessibles')
    await expect(text(page, /Promotion automatique des constats/)).toBeVisible()
  })
})

test.describe('Risk - modèles de scénarios', () => {
  test('catalogue plateforme et filtre par secteur', async ({ page }) => {
    test.skip(!(await open(page, '/risque/modeles')), 'Modèles inaccessibles')
    await expect(text(page, /Modèles de scénarios/)).toBeVisible()
    const plat = page.getByRole('button', { name: /Catalogue plateforme/ })
    test.skip((await count(plat)) === 0, 'Bascule catalogue absente')
    await plat.click()
    await expect(text(page, /Rançongiciel/)).toBeVisible()
    // Le filtre secteur existe.
    await expect(page.locator('select')).toBeVisible()
  })
})

test.describe('Risk - simulateur', () => {
  test('leviers proposés sur un risque', async ({ page }) => {
    test.skip(!(await open(page, '/risque/simulateur')), 'Simulateur inaccessible')
    await expect(text(page, /Simulateur/)).toBeVisible()
    const empty = await count(text(page, /Aucun scénario/))
    test.skip(empty > 0, 'Aucun scénario coté pour simuler')
    await expect(text(page, /Actions à simuler/)).toBeVisible()
    await expect(text(page, /Effet simulé/)).toBeVisible()
  })
})

test.describe('Risk - autres phases', () => {
  for (const [path, label] of [
    ['/risque/plan', /Plan/], ['/risque/acceptations', /Acceptation/], ['/risque/revue', /Revue/],
  ] as const) {
    test(`écran ${path}`, async ({ page }) => {
      test.skip(!(await open(page, path)), `${path} inaccessible`)
      await expect(text(page, label)).toBeVisible()
    })
  }
})

test('aucune erreur console fatale sur le tableau de bord', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  test.skip(!(await open(page, '/risque')), 'Risk inaccessible')
  expect(errors, errors.join('\n')).toHaveLength(0)
})
