import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall, estimateCostUsd } from '../_shared/log-ai-call.ts'

// Phase 4 (code-facing) : pont entre le workflow GitHub Actions et Supabase.
// CI-facing -> authentifie par un SECRET PARTAGE (header x-callback-secret), pas un JWT.
//
// DEPLOIEMENT : a deployer SANS verification JWT a la passerelle (le runner CI n'a
// pas de JWT, il presente notre secret partage) :
//   supabase functions deploy feasibility-callback --no-verify-jwt
// Pattern webhook standard (cf. Stripe). dispatch-feasibility garde la verif JWT
// (appele depuis l'UI avec le JWT owner).
//
// Defense en profondeur : n'accede QU'A agent_runs (par run_id) + la suggestion liee,
// et seulement pour un run encore 'running' (anti-rejeu / anti-ecrasement). Aucune
// autre donnee n'est joignable, meme avec le secret.
//
// Actions :
//   fetch     { run_id }            -> { body, module } de la suggestion (minimise)
//   writeback { run_id, report, usage? } -> ecrit le rapport + passe le run a 'done'
//
// Accepte les runs kind='feasibility' (Phase 4) ET kind='impact' (Phase 5a, RFC 0010) :
// meme contrat fetch/writeback. Le workflow impact (map-reduce multi-modeles) fournit
// le cout agrege dans usage.cost_usd.
const MODEL_LABELS: Record<string, string> = {
  feasibility: 'claude-code-feasibility',
  impact: 'claude-code-impact',
}

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
    const { action, run_id, report, usage, pr_url, pr_branch, pr_state } = await req.json()
    if (!run_id) return json({ error: 'run_id requis' }, 400)

    // Le run doit exister, etre code-facing (feasibility|impact|draft_pr), et encore 'running' (sinon rejeu).
    const { data: run } = await admin.from('agent_runs').select('id, request_id, kind, status, parent_run_id').eq('id', run_id).maybeSingle()
    if (!run || !['feasibility', 'impact', 'draft_pr'].includes(run.kind)) return json({ error: 'Run introuvable' }, 404)
    if (run.status !== 'running') return json({ error: 'Run deja traite' }, 409)
    const label = MODEL_LABELS[run.kind] ?? 'claude-code-feasibility'

    if (action === 'fetch') {
      // Minimisation : on ne renvoie QUE le texte de l'idee + le module. Jamais
      // requester / cabinet / mission (donnees identifiantes inutiles a l'analyse de code).
      const { data: ticket } = await admin.from('support_requests').select('body, context').eq('id', run.request_id).maybeSingle()
      if (!ticket) return json({ error: 'Suggestion introuvable' }, 404)
      const ctx = (ticket.context ?? {}) as { module?: string }
      // Pour un brouillon de PR : joindre le rapport d'impact parent (contexte code, pas de PII).
      let impact: unknown = null
      if (run.kind === 'draft_pr' && run.parent_run_id) {
        const { data: parent } = await admin.from('agent_runs').select('kind, result').eq('id', run.parent_run_id).maybeSingle()
        if (parent?.kind === 'impact') impact = parent.result ?? null
      }
      return json({ body: ticket.body ?? '', module: ctx.module ?? 'Général', impact })
    }

    if (action === 'record_pr') {
      // Brouillon de PR ouvert : on enregistre l'URL/branche/état (kind='draft_pr' uniquement).
      if (run.kind !== 'draft_pr') return json({ error: 'Action reservee aux brouillons de PR' }, 400)
      const { error: upErr } = await admin.from('agent_runs').update({
        status: 'done',
        pr_url: typeof pr_url === 'string' ? pr_url : null,
        pr_branch: typeof pr_branch === 'string' ? pr_branch : null,
        pr_state: typeof pr_state === 'string' ? pr_state : 'open',
      }).eq('id', run_id).eq('kind', 'draft_pr').eq('status', 'running')
      if (upErr) return json({ error: 'Ecriture impossible.' }, 500)
      return json({ ok: true })
    }

    if (action === 'writeback') {
      const inTok = Number(usage?.input_tokens ?? 0) || null
      const outTok = Number(usage?.output_tokens ?? 0) || null
      // Le workflow impact agrege le cout multi-modeles lui-meme ; on le prefere si fourni.
      const providedCost = Number(usage?.cost_usd)
      const cost = Number.isFinite(providedCost) && providedCost > 0 ? providedCost : estimateCostUsd(label, inTok, outTok)
      const ok = report && typeof report === 'object'
      const { error: upErr } = await admin.from('agent_runs').update({
        status: ok ? 'done' : 'error',
        result: ok ? report : { _error: 'rapport invalide' },
        input_tokens: inTok,
        output_tokens: outTok,
        cost_usd: cost,
      }).eq('id', run_id).eq('status', 'running')
      if (upErr) return json({ error: 'Ecriture impossible.' }, 500)

      void logAiCall({ admin, function_name: 'feasibility-callback', model: label, input_tokens: inTok, output_tokens: outTok, success: ok, duration_ms: 0, user_id: null })
      return json({ ok: true })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('feasibility-callback:', err instanceof Error ? err.message : String(err))
    return json({ error: 'Erreur interne.' }, 500)
  }
})
