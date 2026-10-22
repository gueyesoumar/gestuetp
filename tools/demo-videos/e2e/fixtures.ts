import { test as base } from '@playwright/test'

// L'app de test est derrière la protection de déploiement Vercel : la config injecte
// les en-têtes « x-vercel-protection-bypass / x-vercel-set-bypass-cookie » sur CHAQUE
// requête (extraHTTPHeaders est global). Les endpoints auth/REST de Supabase reflètent
// « Access-Control-Request-Headers » et les tolèrent, mais les Edge Functions ont un
// « Access-Control-Allow-Headers » FIXE (authorization, x-client-info, apikey,
// content-type) : l'invoke devient une requête préflightée rejetée (net::ERR_FAILED),
// alors que l'app réelle n'envoie jamais ces en-têtes à Supabase. On les retire donc
// uniquement pour les appels d'Edge Functions (/functions/v1/).
// NB : route.continue() rejoue la requête côté Playwright SANS préflight CORS navigateur,
// donc tout appel d'Edge Function intercepté réussit (c'est précisément ce qui débloque
// les invoke). Exception : « resolve-tenant-by-hostname », l'appel de résolution tenant
// lancé au boot. Sous le domaine de test, il mapperait vers un tenant distinct de l'org
// du compte E2E et déclencherait une déconnexion (isolation white-label). On l'ABORTE pour
// reproduire l'échec réseau de référence (sans bypass) -> l'app retombe sur le tenant par
// défaut et reste connectée.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(/\/functions\/v1\//, (route) => {
      if (route.request().url().includes('resolve-tenant-by-hostname')) return route.abort('failed')
      const headers = { ...route.request().headers() }
      delete headers['x-vercel-protection-bypass']
      delete headers['x-vercel-set-bypass-cookie']
      return route.continue({ headers })
    })
    await use(context)
  },
})

export { expect } from '@playwright/test'
