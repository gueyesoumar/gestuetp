import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall, estimateCostUsd } from '../_shared/log-ai-call.ts'

// Phase 4 (code-facing) : pont entre le workflow GitHub Actions et Supabase.
// CI-facing -> authentifie par un SECRET PARTAGE (header x-callback-secret), pas un JWT.
// Defense en profondeur : n'accede QU'A agent_runs (par run_id) + la suggestion liee,
// et seulement pour un run encore 'running' (anti-rejeu / anti-ecrasement). Aucune
// autre donnee n'est joignable, meme avec le secret.
//
// Actions :
//   fetch     { run_id }            -> { body, module } de la suggestion (minimise)
//   writeback { run_id, report, usage? } -> ecrit le rapport + passe le run a 'done'
const MODEL_LABEL = 'claude-code-feasibility'

/** Comparaison a temps quasi-constant pour limiter les timing attacks sur le secret. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const expected = Deno.env.get('FEASIBILITY_CALLBACK_SECRET')
    if (!expected) return json({ error: 'Callback non configure.' }, 500)
    const provided = req.headers.get('x-callback-secret') ?? ''
    if (!safeEqual(provided, expected)) return json({ error: 'Non autorise.' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { action, run_id, report, usage } = await req.json()
    if (!run_id) return json({ error: 'run_id requis' }, 400)

    // Le run doit exister, etre une faisabilite, et encore 'running' (sinon rejeu).
    const { data: run } = await admin.from('agent_runs').select('id, request_id, kind, status').eq('id', run_id).maybeSingle()
    if (!run || run.kind !== 'feasibility') return json({ error: 'Run introuvable' }, 404)
    if (run.status !== 'running') return json({ error: 'Run deja traite' }, 409)

    if (action === 'fetch') {
      // Minimisation : on ne renvoie QUE le texte de l'idee + le module. Jamais
      // requester / cabinet / mission (donnees identifiantes inutiles a l'analyse de code).
      const { data: ticket } = await admin.from('support_requests').select('body, context').eq('id', run.request_id).maybeSingle()
      if (!ticket) return json({ error: 'Suggestion introuvable' }, 404)
      const ctx = (ticket.context ?? {}) as { module?: string }
      return json({ body: ticket.body ?? '', module: ctx.module ?? 'Général' })
    }

    if (action === 'writeback') {
      const inTok = Number(usage?.input_tokens ?? 0) || null
      const outTok = Number(usage?.output_tokens ?? 0) || null
      const ok = report && typeof report === 'object'
      const { error: upErr } = await admin.from('agent_runs').update({
        status: ok ? 'done' : 'error',
        result: ok ? report : { _error: 'rapport invalide' },
        input_tokens: inTok,
        output_tokens: outTok,
        cost_usd: estimateCostUsd(MODEL_LABEL, inTok, outTok),
      }).eq('id', run_id).eq('status', 'running')
      if (upErr) return json({ error: 'Ecriture impossible.' }, 500)

      void logAiCall({ admin, function_name: 'feasibility-callback', model: MODEL_LABEL, input_tokens: inTok, output_tokens: outTok, success: ok, duration_ms: 0, user_id: null })
      return json({ ok: true })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('feasibility-callback:', err instanceof Error ? err.message : String(err))
    return json({ error: 'Erreur interne.' }, 500)
  }
})
