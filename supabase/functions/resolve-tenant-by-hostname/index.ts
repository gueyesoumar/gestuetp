import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function : resolve-tenant-by-hostname
 *
 * Résout un hostname custom (ex. audit.auditco.sn) vers le branding cabinet,
 * AVANT authentification (la page de login doit déjà être brandée).
 *
 * Endpoint public read-only, lit en service-role :
 *   - cabinet_domains (hostname → cabinet_id, is_verified=true)
 *   - feature_flag_overrides + feature_flags (white_label_branding ON pour ce cabinet ?)
 *   - organization_branding (logos, couleurs, emails)
 *   - organizations (nom, slug)
 *
 * Si le flag est OFF pour le cabinet → on renvoie null (le client doit alors
 * rediriger vers app.gestucomply.com côté frontend).
 *
 * Anti-énumération : limite 30 req/min/IP via Cloudflare/Vercel rate limiting
 * (à brancher au niveau infra, pas dans la function). Réponse mise en cache
 * 60 secondes côté client via Cache-Control.
 */

interface BrandingPayload {
  cabinet_id: string
  cabinet_name: string
  cabinet_slug: string
  logo_light_url: string | null
  logo_dark_url: string | null
  primary_color: string | null
  accent_color: string | null
  support_email: string | null
  email_from_name: string | null
  footer_text: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405, 0)
  }

  try {
    let hostname: string
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({})) as { hostname?: unknown }
      hostname = String(body.hostname ?? '').trim().toLowerCase()
    } else {
      const url = new URL(req.url)
      hostname = String(url.searchParams.get('hostname') ?? '').trim().toLowerCase()
    }

    if (!hostname || hostname.length > 253 || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(hostname)) {
      // 404 générique pour ne pas leaker la liste des hostnames
      return jsonResponse({ branding: null }, 404, 60)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // 1. Hostname → cabinet_id
    const { data: domain } = await admin
      .from('cabinet_domains')
      .select('cabinet_id, is_verified')
      .eq('hostname', hostname)
      .eq('is_verified', true)
      .maybeSingle()

    const d = domain as { cabinet_id: string; is_verified: boolean } | null
    if (!d) {
      return jsonResponse({ branding: null }, 404, 60)
    }

    // 2. Le flag white_label_branding doit être ON pour ce cabinet
    const enabled = await isWhiteLabelEnabled(admin, d.cabinet_id)
    if (!enabled) {
      return jsonResponse({ branding: null, reason: 'flag_disabled' }, 404, 60)
    }

    // 3. Charger branding + organisation
    const [{ data: branding }, { data: org }] = await Promise.all([
      admin
        .from('organization_branding')
        .select('logo_light_url, logo_dark_url, primary_color, accent_color, support_email, email_from_name, footer_text')
        .eq('organization_id', d.cabinet_id)
        .maybeSingle(),
      admin
        .from('organizations')
        .select('id, name, slug, is_active')
        .eq('id', d.cabinet_id)
        .single(),
    ])

    const o = org as { id: string; name: string; slug: string; is_active: boolean } | null
    if (!o || !o.is_active) {
      return jsonResponse({ branding: null }, 404, 60)
    }

    const b = branding as Omit<BrandingPayload, 'cabinet_id' | 'cabinet_name' | 'cabinet_slug'> | null
    const payload: BrandingPayload = {
      cabinet_id: o.id,
      cabinet_name: o.name,
      cabinet_slug: o.slug,
      logo_light_url: b?.logo_light_url ?? null,
      logo_dark_url: b?.logo_dark_url ?? null,
      primary_color: b?.primary_color ?? null,
      accent_color: b?.accent_color ?? null,
      support_email: b?.support_email ?? null,
      email_from_name: b?.email_from_name ?? null,
      footer_text: b?.footer_text ?? null,
    }

    return jsonResponse({ branding: payload }, 200, 60)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[resolve-tenant-by-hostname] error:', message)
    return jsonResponse({ error: 'Erreur interne' }, 500, 0)
  }
})

// deno-lint-ignore no-explicit-any
async function isWhiteLabelEnabled(admin: any, cabinetId: string): Promise<boolean> {
  const { data: flag } = await admin
    .from('feature_flags')
    .select('id, is_globally_enabled')
    .eq('slug', 'white_label_branding')
    .maybeSingle()
  if (!flag) return false
  const f = flag as { id: string; is_globally_enabled: boolean }

  const { data: override } = await admin
    .from('feature_flag_overrides')
    .select('enabled')
    .eq('flag_id', f.id)
    .eq('organization_id', cabinetId)
    .maybeSingle()

  const o = override as { enabled: boolean } | null
  return o?.enabled ?? f.is_globally_enabled
}

function jsonResponse(data: Record<string, unknown>, status: number, cacheSeconds: number): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  }
  if (cacheSeconds > 0) {
    headers['Cache-Control'] = `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`
  } else {
    headers['Cache-Control'] = 'no-store'
  }
  return new Response(JSON.stringify(data), { status, headers })
}
