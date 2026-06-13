import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'

// Phase 4 (code-facing) : declenche l'analyse de faisabilite d'une suggestion.
// UI-facing -> JWT + platform owner + flag DPA. Ne transmet PAS le texte de la
// suggestion a GitHub : il cree un agent_runs(running) et passe seulement run_id
// au workflow, qui recuperera le texte via feasibility-callback (action=fetch).
// Minimisation : le texte ne transite donc ni par les inputs du dispatch ni par
// l'UI publique des Actions — seulement en memoire du runner + Anthropic.

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)

    // Gate 1 : platform owner uniquement.
    const { data: me } = await admin.from('users').select('is_platform_owner').eq('id', auth.profile.id).maybeSingle()
    if (!me?.is_platform_owner) return json({ error: 'Acces reserve.' }, 403)

    // Gate 2 : garde-fou DPA. OFF -> refus (rien ne part vers GitHub/Anthropic).
    const { data: flag } = await admin.from('feature_flags').select('is_globally_enabled').eq('slug', 'support_agent_feasibility').maybeSingle()
    if (!flag?.is_globally_enabled) return json({ error: 'Agent de faisabilite desactive.' }, 403)

    const ghToken = Deno.env.get('GITHUB_DISPATCH_TOKEN')
    const ghRepo = Deno.env.get('GITHUB_REPO')          // ex: gueyesoumar/gestuetp
    const ghRef = Deno.env.get('FEASIBILITY_WORKFLOW_REF') ?? 'main'
    if (!ghToken || !ghRepo) return json({ error: 'Dispatch non configure.' }, 500)

    const { request_id } = await req.json()
    if (!request_id) return json({ error: 'request_id requis' }, 400)

    const { data: ticket } = await admin.from('support_requests').select('id, nature').eq('id', request_id).maybeSingle()
    if (!ticket || ticket.nature !== 'suggestion') return json({ error: 'Suggestion introuvable' }, 404)

    // Cree le run AVANT le dispatch : le workflow s'y rattache via run_id.
    const { data: run, error: runErr } = await admin.from('agent_runs').insert({
      request_id, kind: 'feasibility', status: 'running', created_by: auth.profile.id,
    }).select('id').single()
    if (runErr || !run) return json({ error: 'Creation du run impossible.' }, 500)

    // Declenche le workflow_dispatch. Inputs minimaux : seulement run_id.
    const res = await fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/feasibility.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'gestu-comply-dispatch',
      },
      body: JSON.stringify({ ref: ghRef, inputs: { run_id: run.id } }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('dispatch-feasibility github:', res.status, detail.slice(0, 300))
      await admin.from('agent_runs').update({ status: 'error', result: { _error: 'dispatch GitHub echoue' } }).eq('id', run.id)
      return json({ error: 'Declenchement de l analyse impossible.' }, 502)
    }

    return json({ ok: true, run_id: run.id })
  } catch (err) {
    console.error('dispatch-feasibility:', err instanceof Error ? err.message : String(err))
    return json({ error: 'Erreur interne.' }, 500)
  }
})
