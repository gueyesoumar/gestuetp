import { test, expect } from './fixtures'
import { open, text, count } from './helpers'

// J2 - Écritures régulateur (cross-org). Projet « regulateur » (REGA, voit tout).

const DOUANES = 'Direction Générale des Douanes (test)'

async function openConsolidated(page: import('@playwright/test').Page): Promise<boolean> {
  if (!(await open(page, '/risque/registre'))) return false
  const all = page.getByRole('button', { name: /Tous les assujettis/ })
  if (await count(all)) { await all.first().click(); await page.waitForTimeout(600) }
  return true
}

test.describe('Régulateur - créer un risque pour un assujetti', () => {
  test('création cross-org depuis le registre consolidé (badge Autorité)', async ({ page }) => {
    test.skip(!(await openConsolidated(page)), 'Registre consolidé inaccessible')
    const nouv = page.getByRole('button', { name: /Nouveau risque/ })
    test.skip(!(await count(nouv)), 'Bouton Nouveau risque absent')
    await nouv.first().click()
    await page.waitForTimeout(500)

    // Tout scoper à la modale (sinon collision avec les selects du FilterBar derrière).
    const modal = page.locator('div.fixed.inset-0.z-50')
    await expect(modal.getByText(/Nouveau risque/)).toBeVisible()
    await modal.locator('select').filter({ has: page.locator('option', { hasText: DOUANES }) })
      .selectOption({ label: DOUANES })
    const titre = `E2E cross-org ${Date.now()}`
    await modal.getByPlaceholder(/Rançongiciel sur le SI/i).fill(titre)
    await modal.locator('select').filter({ has: page.locator('option', { hasText: 'Sélectionner' }) })
      .selectOption({ label: 'Sécurité' })

    await modal.getByRole('button', { name: /Ajouter au registre/ }).click()

    // Le risque créé apparaît dans le registre consolidé, marqué « Autorité ».
    await expect(page.getByText(titre)).toBeVisible({ timeout: 15000 })
    await expect(text(page, /Autorité/)).toBeVisible()
  })
})

test.describe('Régulateur - demander une action (suggestions)', () => {
  test('les suggestions par dimension préremplissent la demande', async ({ page }) => {
    test.skip(!(await openConsolidated(page)), 'Registre consolidé inaccessible')
    const demander = page.getByRole('button', { name: /Demander une action/ })
    test.skip(!(await count(demander)), 'Aucune action à demander')
    await demander.first().click()
    await page.waitForTimeout(400)
    await expect(text(page, /Suggestions/i)).toBeVisible()
    const sugg = page.getByRole('button', { name: /MFA|correctifs|sauvegardes|Chiffrer|Segmenter/i }).first()
    test.skip(!(await count(sugg)), 'Pas de suggestion pour cette dimension')
    await sugg.click()
    await expect(page.locator('textarea')).not.toHaveValue('')
    // On ne soumet pas (évite d'empiler des directives à chaque run).
  })
})
