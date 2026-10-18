import { test, expect } from '@playwright/test'
import { open, text, count } from './helpers'

// Portail assujetti (projet « portail », session .auth/client.json). Lecture seule :
// on vérifie l'accès aux directives et au tableau de bord, sans répondre ni téléverser.

test('portail - tableau de bord accessible', async ({ page }) => {
  test.skip(!(await open(page, '/client')), 'Portail inaccessible (session portail absente)')
  await expect(text(page, /Tableau de bord|Mes missions|Directives/)).toBeVisible()
})

test('portail - écran Directives du régulateur', async ({ page }) => {
  test.skip(!(await open(page, '/client/directives')), 'Directives inaccessibles')
  await expect(text(page, /Directives du régulateur/)).toBeVisible()
  // Soit des directives, soit l'état vide, les deux sont valides.
  await expect(text(page, /Aucune directive|Échéance|Vérification/)).toBeVisible()
})

test('portail - ouverture du détail d\'une directive (sans soumettre)', async ({ page }) => {
  test.skip(!(await open(page, '/client/directives')), 'Directives inaccessibles')
  const respond = page.getByRole('button', { name: /Répondre|Voir/ })
  test.skip((await count(respond)) === 0, 'Aucune directive à ouvrir')
  await respond.first().click()
  await page.waitForTimeout(500)
  await expect(text(page, /Répondre à la directive|Preuves|Statut/)).toBeVisible()
  // On ferme sans écrire.
  const cancel = page.getByRole('button', { name: /Annuler|Terminer/ })
  if (await count(cancel)) await cancel.first().click()
})
