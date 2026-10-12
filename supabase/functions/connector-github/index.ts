import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'
import { collectGithubForOrg } from '../_shared/github-collect.ts'

// Connecteur GitHub (RFC 0014 P3). Auth = token (fine-grained PAT) PAR ORG, stocké
// en Vault. `connect` valide le token + l'organisation ; `collect` délègue au
// collecteur partagé (aussi utilisé par connector-dispatch).

const GH_BASE = 'https://api.github.com'

function ghHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'gestu-etp-connector',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')
    let callerId: string | null = null
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
      callerId = user?.id ?? null
    }
    if (!callerId) return json({ error: 'Non autorisé' }, 401)

    const { data: profile } = await supabaseAdmin.from('users').select('id, organization_id').eq('auth_id', callerId).single()
    if (!profile) return json({ error: 'Profil introuvable' }, 403)
    const orgId: string = profile.organization_id

    const { data: cap } = await supabaseAdmin
      .from('organization_capabilities').select('capability')
      .eq('org_id', orgId).eq('capability', 'continuous_compliance').eq('status', 'active')
      .maybeSingle()
    if (!cap) return json({ error: 'Module Conformité continue non activé' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = body?.action

    if (action === 'connect') {
      const token = String(body.token ?? '').trim()
      const org = String(body.org ?? '').trim()
      if (!token || !org) return json({ error: 'Token et organisation requis' }, 400)

      const test = await fetch(`${GH_BASE}/orgs/${encodeURIComponent(org)}`, { headers: ghHeaders(token) })
      if (!test.ok) return json({ error: 'Token GitHub invalide ou organisation inaccessible' }, 400)

      const { data: secretRef, error: vErr } = await supabaseAdmin.rpc('connector_secret_store', {
        p_org: orgId, p_provider: 'github', p_payload: { token },
      })
      if (vErr || !secretRef) { console.error('[connector-github] vault:', vErr?.message); return json({ error: 'Stockage sécurisé impossible' }, 500) }

      const { error: upErr } = await supabaseAdmin.from('connector_integrations').upsert({
        organization_id: orgId, provider: 'github', status: 'active',
        scopes: ['org:read', 'repo:read'], secret_ref: secretRef,
        external_account: org, connected_by: profile.id,
        connected_at: new Date().toISOString(), last_error: null,
      }, { onConflict: 'organization_id,provider' })
      if (upErr) { console.error('[connector-github] integration:', upErr.message); return json({ error: 'Enregistrement impossible' }, 500) }

      await logActivity(supabaseAdmin, {
        organizationId: orgId, actorUserId: profile.id, action: 'connector.connected',
        targetType: 'connector', targetLabel: 'GitHub', summary: `Connecteur GitHub connecté (${org})`,
      })
      return json({ ok: true })
    }

    if (action === 'collect') {
      const outcome = await collectGithubForOrg(supabaseAdmin, orgId, profile.id)
      if (outcome.error === 'no_active_integration') return json({ error: 'Aucune connexion GitHub active' }, 400)
      if (outcome.error === 'no_credentials' || outcome.error === 'no_org_login') return json({ error: 'Connexion GitHub incomplète' }, 500)
      return json({ ok: true, collected: outcome.collected, results: outcome.results })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('[connector-github]', err instanceof Error ? err.message : String(err))
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
