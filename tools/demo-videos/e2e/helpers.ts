import { type Page, type Locator } from '@playwright/test'

/** Va sur `path` ; renvoie false si l'app a redirigé ailleurs (rôle non autorisé, login). */
export async function open(page: Page, path: string): Promise<boolean> {
  await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(700)
  return new URL(page.url()).pathname.startsWith(path.split('?')[0])
}

/** Première occurrence visible d'un texte (robuste aux doublons). */
export function text(page: Page, t: string | RegExp): Locator {
  return page.getByText(t).first()
}

/** Compte les occurrences (0 si absent) sans faire échouer. */
export async function count(loc: Locator): Promise<number> {
  return loc.count().catch(() => 0)
}
