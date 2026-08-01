import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'
import { authenticateCaller } from '../_shared/auth.ts'

// Agent de triage (Phase 3, data-facing). Owner-only + gate par feature flag.
// Boucle tool-use Anthropic : outils DB EN LECTURE SEULE + submit_triage (sortie structuree).
const MODEL = 'claude-sonnet-4-6'
const MAX_TURNS = 8

const TOOLS = [
  {
    name: 'get_mission',
    description: 'Metadonnees d\'une mission par id (statut, framework, cabinet) — sans nom.',
    input_schema: { type: 'object', properties: { mission_id: { type: 'string' } }, required: ['mission_id'] },
  },
  {
    name: 'mission_stats',
    description: 'Compteurs d\'une mission : evaluations par statut, demandes de preuve par statut.',
    input_schema: { type: 'object', properties: { mission_id: { type: 'string' } }, required: ['mission_id'] },
  },
  {
    name: 'submit_triage',
    description: 'Rendre le diagnostic final structure.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['bug_code', 'probleme_donnee', 'permission_rls', 'erreur_utilisateur', 'infra_externe', 'indetermine'] },
        gravity: { type: 'string', enum: ['critique', 'elevee', 'moyenne', 'faible'] },
        cause: { type: 'string' },
        action: { type: 'string' },
        data_seen: { type: 'string' },
      },
      required: ['category', 'gravity', 'cause', 'action'],
    },
  },
]

// deno-lint-ignore no-explicit-any
async function runTool(admin: any, name: string, input: Record<string, string>): Promise<unknown> {
  if (name === 'get_mission') {
    // Minimisation : on n'expose PAS le nom de la mission (peut reveler l'identite d'un client).
    const { data } = await admin.from('missions').select('id,status,framework_id,cabinet_id,client_id').eq('id', input.mission_id).maybeSingle()
    return data ?? { _error: 'mission introuvable' }
  }
  if (name === 'mission_stats') {
    const mid = input.mission_id
    const [a, e] = await Promise.all([
      admin.from('control_assessments').select('status').eq('mission_id', mid),
      admin.from('mission_evidence_requests').select('status').eq('mission_id', mid),
    ])
    // deno-lint-ignore no-explicit-any
    const tally = (rows: any[] | null) => (rows ?? []).reduce((acc: Record<string, number>, r: { status: string }) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {})
    return { assessments_by_status: tally(a.data), evidence_by_status: tally(e.data) }
  }
  return { _error: 'outil inconnu' }
}

const SYSTEM = `Tu es l'agent de triage support de Gestu Comply (plateforme multi-tenant d'audit/conformite).
On te donne un ticket de bug + une TRACE de reproduction (clics, navigations, erreurs reseau captees).
Enquete avec les outils EN LECTURE SEULE, puis appelle submit_triage avec ton diagnostic.
Appuie-toi d'abord sur la trace (une erreur 4xx + la requete fautive donnent souvent la cause directe).
Reste factuel : ne conclus pas sans element. Reponds en francais.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) return json({ error: 'Cle API non configuree' }, 500)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)

    // Gate 1 : platform owner uniquement.
    const { data: me } = await admin.from('users').select('is_platform_owner').eq('id', auth.profile.id).maybeSingle()
    if (!me?.is_platform_owner) return json({ error: 'Acces reserve.' }, 403)

    // Gate 2 : feature flag (garde-fou DPA). OFF -> refus.
    const { data: flag } = await admin.from('feature_flags').select('is_globally_enabled').eq('slug', 'support_agent_triage').maybeSingle()
    if (!flag?.is_globally_enabled) return json({ error: 'Agent de triage desactive.' }, 403)

    const { request_id } = await req.json()
    if (!request_id) return json({ error: 'request_id requis' }, 400)

    const { data: ticket } = await admin.from('support_requests').select('id, nature, title, body, context, mission_id, cabinet_id').eq('id', request_id).maybeSingle()
    if (!ticket || ticket.nature !== 'bug') return json({ error: 'Ticket bug introuvable' }, 404)

    const startedAt = Date.now()
    // deno-lint-ignore no-explicit-any
    const messages: any[] = [{
      role: 'user',
      content: `Ticket #${String(ticket.id).slice(0, 8)} — ${ticket.title}\nCommentaire: ${ticket.body ?? '(aucun)'}\nMission: ${ticket.mission_id ?? '(aucune)'}\nTrace de reproduction:\n${JSON.stringify(ticket.context?.steps ?? [], null, 1)}`,
    }]

    let triage: Record<string, unknown> | null = null
    let inTok = 0, outTok = 0

    for (let turn = 0; turn < MAX_TURNS && !triage; turn++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: SYSTEM, tools: TOOLS, messages }),
      })
      if (!res.ok) {
        void logAiCall({ admin, function_name: 'run-agent', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${res.status}`, duration_ms: Date.now() - startedAt, mission_id: ticket.mission_id ?? null, organization_id: ticket.cabinet_id ?? null, user_id: auth.profile.id })
        return json({ error: 'Erreur du moteur de triage.' }, 502)
      }
      const data = await res.json()
      inTok += data.usage?.input_tokens ?? 0
      outTok += data.usage?.output_tokens ?? 0
      // deno-lint-ignore no-explicit-any
      const content = data.content as any[]
      if (data.stop_reason !== 'tool_use') break

      messages.push({ role: 'assistant', content })
      // deno-lint-ignore no-explicit-any
      const results: any[] = []
      for (const block of content) {
        if (block.type !== 'tool_use') continue
        if (block.name === 'submit_triage') { triage = block.input; break }
        const out = await runTool(admin, block.name, block.input)
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out).slice(0, 4000) })
      }
      if (!triage) messages.push({ role: 'user', content: results })
    }

    void logAiCall({ admin, function_name: 'run-agent', model: MODEL, input_tokens: inTok, output_tokens: outTok, success: true, duration_ms: Date.now() - startedAt, mission_id: ticket.mission_id ?? null, organization_id: ticket.cabinet_id ?? null, user_id: auth.profile.id })

    const status = triage ? 'done' : 'error'
    const { data: run } = await admin.from('agent_runs').insert({
      request_id, kind: 'triage', status, result: triage, input_tokens: inTok, output_tokens: outTok, created_by: auth.profile.id,
    }).select('id').single()

    return json({ ok: !!triage, run_id: run?.id ?? null, triage })
  } catch (err) {
    console.error('run-agent:', err instanceof Error ? err.message : String(err))
    return json({ error: 'Erreur interne.' }, 500)
  }
})
