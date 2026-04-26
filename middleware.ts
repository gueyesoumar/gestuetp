/**
 * Vercel Edge Middleware — gatekeeper hostname pour la marque blanche.
 *
 * Tourne sur l'edge V8 avant de servir l'app. Pour les hostnames neutres
 * (Gëstu, vercel preview, localhost), laisse passer. Pour les hostnames
 * custom, vérifie via resolve-tenant-by-hostname qu'ils sont déclarés et
 * vérifiés dans cabinet_domains. Si non → redirige vers app.gestugroup.com.
 *
 * Note : la BrandingProvider côté client refait la résolution pour récupérer
 * logos/couleurs. Ce middleware sert de garde-fou + permet de couper rapidement
 * un domaine custom en révoquant l'entrée cabinet_domains côté admin.
 *
 * Variables d'env requises sur Vercel :
 *   VITE_SUPABASE_URL  (ou SUPABASE_URL)   — URL projet Supabase
 *   VITE_SUPABASE_ANON_KEY  (ou SUPABASE_ANON_KEY) — anon key publique
 *   APP_PRIMARY_HOSTNAME (optionnel) — défaut app.gestugroup.com
 */

export const config = {
  // Exclut les assets statiques pour éviter un appel par image
  matcher: ['/((?!assets|favicon\\.ico|robots\\.txt|.*\\.(?:js|css|map|png|jpg|svg|woff2?|ico)$).*)'],
}

const NEUTRAL_HOSTNAMES = new Set([
  'app.gestugroup.com',
  'gestugroup.com',
  'www.gestugroup.com',
  'localhost',
  '127.0.0.1',
])

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const hostname = url.hostname.toLowerCase()

  // Hostnames neutres ou previews Vercel : passe sans contrôle
  if (NEUTRAL_HOSTNAMES.has(hostname) || hostname.endsWith('.vercel.app')) {
    return passthrough(request)
  }

  const supabaseUrl =
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.VITE_SUPABASE_URL ??
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.SUPABASE_URL
  const anonKey =
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.VITE_SUPABASE_ANON_KEY ??
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    console.warn('[middleware] Supabase env vars manquantes — passthrough')
    return passthrough(request)
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/resolve-tenant-by-hostname?hostname=${encodeURIComponent(hostname)}`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      },
    )
    if (res.ok) {
      const data = (await res.json()) as { branding?: unknown }
      if (data.branding) return passthrough(request)
    }
  } catch (err) {
    console.warn('[middleware] resolve échec:', err instanceof Error ? err.message : err)
    // En cas d'échec edge → passthrough plutôt que de couper l'app entièrement
    return passthrough(request)
  }

  // Hostname inconnu → redirect vers le domaine principal
  const primaryHostname =
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.APP_PRIMARY_HOSTNAME ??
    'app.gestugroup.com'
  return Response.redirect(`https://${primaryHostname}${url.pathname}${url.search}`, 302)
}

function passthrough(_request: Request): Response {
  // Vercel edge middleware : retourner Response.next() équivalent en renvoyant
  // une Response vide avec le header x-middleware-next: 1
  return new Response(null, { headers: { 'x-middleware-next': '1' } })
}
