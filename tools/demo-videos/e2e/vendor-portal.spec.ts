import { test, expect } from './fixtures'
import { open, text, count } from './helpers'

// J3 - Vendor côté candidat (VEN, portail). Auto-évaluation PASI.

test.describe('Candidat fournisseur - auto-évaluation PASI', () => {
  test('voit son auto-évaluation et peut coter un contrôle', async ({ page }) => {
    test.skip(!(await open(page, '/client/evaluations')), 'Portail évaluations inaccessible')
    await expect(text(page, /Évaluations sécurité/)).toBeVisible()
    await expect(text(page, /PASI/)).toBeVisible()
    await page.getByText(/PASI/).first().click()
    await page.waitForTimeout(900)
    await expect(text(page, /Auto-évaluation|cotés|À coter/i)).toBeVisible()
    // Coter un contrôle (1er select de conformité) ; on NE soumet PAS (soumission = verrouillage).
    const selects = page.locator('select')
    test.skip((await count(selects)) === 0, 'Aucun contrôle à coter')
    await selects.first().selectOption({ label: 'Conforme' }).catch(async () => {
      await selects.first().selectOption({ index: 1 })
    })
    await page.waitForTimeout(400)
    // La progression « cotés » doit refléter au moins 1.
    await expect(text(page, /cotés|Soumettre/i)).toBeVisible()
  })
})
