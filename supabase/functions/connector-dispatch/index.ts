import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { collectTenableForOrg } from '../_shared/tenable-collect.ts'
import { collectGithubForOrg } from '../_shared/github-collect.ts'

// Dispatcher de collecte planifiée (RFC 0014 P2). Appelé par pg_cron (hebdo) avec
// un en-tête x-cron-secret. Tourne en service_role, SANS utilisateur : il itère les
// intégrations actives et lance la collecte de chaque org via le collecteur partagé.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Auth : secret d'ordonnancement uniquement (pas d'utilisateur).
    const cronSecret = req.headers.get('x-cron-secret')
    const expected = Deno.env.get('CONNECTOR_CRON_SECRET')
    if (!cronSecret || !expected || !timingSafeEqual(cronSecret, expected)) {
      return json({ error: 'Non autorisé' }, 401)
    }

    const { data: integs, error } = await admin
      .from('connector_integrations').select('organization_id, provider').eq('status', 'active')
    if (error) { console.error('[connector-dispatch]', error.message); return json({ error: 'Erreur de chargement' }, 500) }

    let totalCollected = 0
    const failures: Array<{ org: string; provider: string; error: string }> = []
    for (const integ of (integs ?? []) as Array<{ organization_id: string; provider: string }>) {
      try {
        let outcome: { collected: number; error?: string } | null = null
        if (integ.provider === 'tenable') outcome = await collectTenableForOrg(admin, integ.organization_id, null)
        else if (integ.provider === 'github') outcome = await collectGithubForOrg(admin, integ.organization_id, null)
        // autres providers : ajoutés ici au fil des connecteurs (RFC 0014 P4).
        if (outcome) {
          totalCollected += outcome.collected
          if (outcome.error) failures.push({ org: integ.organization_id, provider: integ.provider, error: outcome.error })
        }
      } catch (e) {
        failures.push({ org: integ.organization_id, provider: integ.provider, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return json({ ok: true, integrations: integs?.length ?? 0, collected: totalCollected, failures })
  } catch (err) {
    console.error('[connector-dispatch]', err instanceof Error ? err.message : String(err))
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
