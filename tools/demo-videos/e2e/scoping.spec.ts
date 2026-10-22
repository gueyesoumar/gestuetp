import { test, expect } from '@playwright/test'
import { open, text, count } from './helpers'

// J6 - Isolation / scoping superviseur (mig 00327).
// REGS est affecté à « Douanes » UNIQUEMENT : il doit voir Douanes mais JAMAIS « Santé »,
// ni dans le portefeuille, ni dans le registre consolidé. Valide le cloisonnement par affectation.

const DOUANES = /Douanes/i
const SANTE = /Minist.re de la Sant/i // "Ministère de la Santé (test)"

test.describe('Isolation superviseur - portée par affectation', () => {
  test('portefeuille : Douanes visible, Santé absente', async ({ page }) => {
    test.skip(!(await open(page, '/risque/portefeuille')), 'Portefeuille inaccessible')
    await expect(text(page, /Portefeuille de risque|Cockpit/i)).toBeVisible()
    await expect(text(page, DOUANES)).toBeVisible()
    expect(await count(page.getByText(SANTE))).toBe(0)
  })

  test('registre consolidé : Douanes présent, aucun élément de Santé', async ({ page }) => {
    test.skip(!(await open(page, '/risque/registre')), 'Registre inaccessible')
    const all = page.getByRole('button', { name: /Tous les assujettis/ })
    test.skip(!(await count(all)), 'Bascule consolidée absente')
    await all.first().click()
    await page.waitForTimeout(700)
    await expect(text(page, DOUANES)).toBeVisible()
    expect(await count(page.getByText(SANTE))).toBe(0)
  })

  test('revue & surveillance consolidée : pas de Santé', async ({ page }) => {
    test.skip(!(await open(page, '/risque/revue')), 'Revue inaccessible')
    const all = page.getByRole('button', { name: /Tous les assujettis/ })
    if (await count(all)) {
      await all.first().click()
      await page.waitForTimeout(700)
    }
    expect(await count(page.getByText(SANTE))).toBe(0)
  })
})
