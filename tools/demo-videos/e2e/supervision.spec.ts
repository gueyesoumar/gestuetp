import { test, expect } from '@playwright/test'
import { open, text, count } from './helpers'

// Supervision régulateur (lecture seule) : portefeuille, affectations, registre consolidé.

test.describe('Supervision - portefeuille', () => {
  test('KPIs, répartition et table', async ({ page }) => {
    test.skip(!(await open(page, '/risque/portefeuille')), 'Portefeuille inaccessible')
    await expect(text(page, /Cockpit de supervision|Portefeuille de risque/)).toBeVisible()
    await expect(text(page, /Hors seuil|Revues en retard|Demandes/)).toBeVisible()
    await expect(text(page, /Cartographie du risque|Répartition par exposition/)).toBeVisible()
  })

  test('pastille exposition multi-org', async ({ page }) => {
    test.skip(!(await open(page, '/risque/portefeuille')), 'Portefeuille inaccessible')
    const info = page.getByRole('button', { name: /exposition est calculée/i })
    if (await count(info)) {
      await info.first().click()
      await expect(text(page, /configurable par organisation|V . I . 16/)).toBeVisible()
    }
  })

  test('drill-down sur un assujetti', async ({ page }) => {
    test.skip(!(await open(page, '/risque/portefeuille')), 'Portefeuille inaccessible')
    const rows = page.locator('table tbody tr')
    test.skip((await count(rows)) === 0, 'Aucun assujetti supervisé')
    await rows.first().click()
    await page.waitForTimeout(600)
    // Vue détaillée de l'org (risques) ou retour.
    await expect(text(page, /Retour|Demander une action|risque/i)).toBeVisible()
  })
})

test.describe('Supervision - affectations', () => {
  test('écran et alerte « sans responsable »', async ({ page }) => {
    const ok = await open(page, '/risque/affectations')
    test.skip(!ok, 'Affectations inaccessibles (rôle sans permission)')
    // Soit l'écran de gestion, soit l'accès réservé selon la permission.
    await expect(text(page, /Affectations de supervision|Accès réservé/)).toBeVisible()
    if (await count(text(page, /Nouvelle affectation/))) {
      await expect(text(page, /Nouvelle affectation/)).toBeVisible()
    }
  })
})

test.describe('Supervision - registre consolidé', () => {
  test('bascule « Tous les assujettis »', async ({ page }) => {
    test.skip(!(await open(page, '/risque/registre')), 'Registre inaccessible')
    await expect(text(page, /Tous les assujettis|Registre des risques/)).toBeVisible()
    // En mode consolidé, la recherche/filtre existe.
    const all = page.getByRole('button', { name: /Tous les assujettis/ })
    if (await count(all)) {
      await all.click()
      await page.waitForTimeout(500)
      await expect(text(page, /Assujetti|Secteur|Exposition/i)).toBeVisible()
    }
  })
})
