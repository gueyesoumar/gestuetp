import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'
import { collectTenableForOrg } from '../_shared/tenable-collect.ts'

// Connecteur Tenable Vulnerability Management (cloud) - RFC 0014 P1.3.
// Auth Tenable = clés d'API PAR ORG (header X-ApiKeys), stockées en Vault.
// Actions : `connect` (valide + stocke) et `collect` (délègue au collecteur partagé,
// aussi utilisé par le dispatcher planifié connector-dispatch).

const TENABLE_BASE = 'https://cloud.tenable.com'

function tenableHeaders(accessKey: string, secretKey: string): HeadersInit {
  return { 'X-ApiKeys': `accessKey=${accessKey};secretKey=${secretKey}`, 'Accept': 'application/json' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Identité de l'appelant (JWT vérifié ; aucun fallback header).
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

    // 2. Gate : le module Conformité continue doit être actif pour l'org.
    const { data: cap } = await supabaseAdmin
      .from('organization_capabilities').select('capability')
      .eq('org_id', orgId).eq('capability', 'continuous_compliance').eq('status', 'active')
      .maybeSingle()
    if (!cap) return json({ error: 'Module Conformité continue non activé' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = body?.action

    // ───────────────────── CONNECT ─────────────────────
    if (action === 'connect') {
      const accessKey = String(body.accessKey ?? '').trim()
      const secretKey = String(body.secretKey ?? '').trim()
      if (!accessKey || !secretKey) return json({ error: 'Clés d\'API requises' }, 400)

      const test = await fetch(`${TENABLE_BASE}/session`, { headers: tenableHeaders(accessKey, secretKey) })
      if (!test.ok) return json({ error: 'Clés Tenable invalides ou API inaccessible' }, 400)

      const { data: secretRef, error: vErr } = await supabaseAdmin.rpc('connector_secret_store', {
        p_org: orgId, p_provider: 'tenable', p_payload: { accessKey, secretKey },
      })
      if (vErr || !secretRef) { console.error('[connector-tenable] vault:', vErr?.message); return json({ error: 'Stockage sécurisé impossible' }, 500) }

      const { error: upErr } = await supabaseAdmin.from('connector_integrations').upsert({
        organization_id: orgId, provider: 'tenable', status: 'active',
        scopes: ['vuln:read', 'scans:read'], secret_ref: secretRef,
        external_account: 'cloud.tenable.com', connected_by: profile.id,
        connected_at: new Date().toISOString(), last_error: null,
      }, { onConflict: 'organization_id,provider' })
      if (upErr) { console.error('[connector-tenable] integration:', upErr.message); return json({ error: 'Enregistrement impossible' }, 500) }

      await logActivity(supabaseAdmin, {
        organizationId: orgId, actorUserId: profile.id, action: 'connector.connected',
        targetType: 'connector', targetLabel: 'Tenable', summary: 'Connecteur Tenable connecté',
      })
      return json({ ok: true })
    }

    // ───────────────────── COLLECT (manuel) ─────────────────────
    if (action === 'collect') {
      const outcome = await collectTenableForOrg(supabaseAdmin, orgId, profile.id)
      if (outcome.error === 'no_active_integration') return json({ error: 'Aucune connexion Tenable active' }, 400)
      if (outcome.error === 'no_credentials') return json({ error: 'Identifiants introuvables' }, 500)
      return json({ ok: true, collected: outcome.collected, results: outcome.results })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('[connector-tenable]', err instanceof Error ? err.message : String(err))
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
