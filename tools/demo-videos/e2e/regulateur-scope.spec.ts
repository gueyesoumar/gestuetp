import { test, expect } from '@playwright/test'
import { open, text } from './helpers'

// J6 - Contraste du scoping : REGA (admin, voit tout) voit Douanes ET Santé dans le
// portefeuille. À opposer à scoping.spec.ts (REGS ne voit que Douanes).

test.describe('Régulateur admin - visibilité complète', () => {
  test('portefeuille : Douanes ET Santé visibles', async ({ page }) => {
    test.skip(!(await open(page, '/risque/portefeuille')), 'Portefeuille inaccessible')
    await expect(text(page, /Douanes/i)).toBeVisible()
    await expect(text(page, /Minist.re de la Sant/i)).toBeVisible()
  })
})
