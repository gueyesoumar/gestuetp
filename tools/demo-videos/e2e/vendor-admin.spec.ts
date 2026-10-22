import { test, expect } from '@playwright/test'
import { open, text } from './helpers'

// J3 - Vendor côté régulateur (REGA). Registre des tiers + fiche fournisseur.

test.describe('Régulateur - registre des tiers (Vendor)', () => {
  test('Fournisseur F présent et ouverture de sa fiche', async ({ page }) => {
    test.skip(!(await open(page, '/fournisseurs')), 'Module Vendor inaccessible')
    await expect(text(page, /Registre des tiers/)).toBeVisible()
    await expect(text(page, /Fournisseur Test F/)).toBeVisible()
    await page.getByText(/Fournisseur Test F/).first().click()
    await page.waitForTimeout(800)
    await expect(text(page, /PASI|Référentiel|Nouvelle évaluation|Évaluation|Qualification|Inviter/i)).toBeVisible()
  })
})
