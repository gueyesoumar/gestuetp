import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall, estimateCostUsd } from '../_shared/log-ai-call.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { buildSystem, TOURS } from './platform-map.ts'

// Assistant d'onboarding (RFC 0011, data-facing, LECTURE SEULE). Staff/owner + gate flag.
// Boucle tool-use Anthropic EN STREAMING (SSE) : search_help (articles filtrés par
// audience) + suggest_tour + report_unresolved. Aucun outil mutatif. Clé API serveur-only.
const HAIKU = 'claude-haiku-4-5-20251001'
const SONNET = 'claude-sonnet-4-6'
const MAX_TURNS = 6
const MAX_TOKENS = 1024
const BUDGET_USD = 0.5 // plafond dur par requête (déc. D)

const TOUR_IDS = new Set(TOURS.map((t) => t.id))

const TOOLS = [
  {
    name: 'search_help',
    description: "Recherche dans les articles d'aide de la plateforme. À appeler avant de répondre à toute question de fonctionnement.",
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'mots-clés en français' } }, required: ['query'] },
  },
  {
    name: 'suggest_tour',
    description: "Propose un tour guidé interactif existant (l'utilisateur décidera de le lancer). N'utiliser qu'un id de la liste fournie.",
    input_schema: { type: 'object', properties: { tour_id: { type: 'string', enum: [...TOUR_IDS] } }, required: ['tour_id'] },
  },
  {
    name: 'report_unresolved',
    description: "À appeler quand l'aide ne couvre pas la question (aucun article pertinent), pour la signaler à l'amélioration continue.",
    input_schema: { type: 'object', properties: { reason: { type: 'string' } } },
  },
]

// deno-lint-ignore no-explicit-any
async function searchHelp(admin: any, query: string, audiences: string[]): Promise<unknown> {
  const q = (query || '').replace(/[,()*%.]/g, ' ').trim().slice(0, 120)
  let sel = admin.from('help_articles').select('slug,title,excerpt,body,category').eq('is_published', true).in('audience', audiences).limit(6)
  if (q) sel = sel.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,body.ilike.%${q}%`)
  const { data, error } = await sel
  if (error) return { _error: 'recherche indisponible' }
  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((a: any) => ({ slug: a.slug, title: a.title, category: a.category, excerpt: a.excerpt, body: (a.body || '').slice(0, 1200) }))
}

interface Block { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }
interface TurnResult { blocks: Block[]; stopReason: string | null; inTok: number; outTok: number }

// Consomme le flux SSE d'Anthropic, réémet le texte vers le client, et reconstruit les
// blocs de contenu (texte + tool_use) pour la suite de la boucle tool-use.
async function streamTurn(
  key: string,
  model: string,
  // deno-lint-ignore no-explicit-any
  payload: Record<string, any>,
  sse: (obj: unknown) => Promise<void>,
): Promise<TurnResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, model, stream: true }),
  })
  if (!res.ok || !res.body) throw new Error(`anthropic ${res.status}`)

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let inTok = 0, outTok = 0, stopReason: string | null = null
  const blocks: Block[] = []
  let cur: Block | null = null
  let curJson = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2)
      const line = chunk.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const dataStr = line.slice(5).trim()
      if (!dataStr || dataStr === '[DONE]') continue
      let ev: Record<string, unknown>
      try { ev = JSON.parse(dataStr) } catch { continue }

      // deno-lint-ignore no-explicit-any
      const e = ev as any
      switch (e.type) {
        case 'message_start':
          inTok += e.message?.usage?.input_tokens ?? 0
          break
        case 'content_block_start':
          if (e.content_block?.type === 'text') cur = { type: 'text', text: '' }
          else if (e.content_block?.type === 'tool_use') { cur = { type: 'tool_use', id: e.content_block.id, name: e.content_block.name, input: {} }; curJson = ''; await sse({ type: 'tool', name: cur.name }) }
          else cur = null
          break
        case 'content_block_delta':
          if (e.delta?.type === 'text_delta' && cur?.type === 'text') { cur.text += e.delta.text; await sse({ type: 'delta', text: e.delta.text }) }
          else if (e.delta?.type === 'input_json_delta' && cur?.type === 'tool_use') curJson += e.delta.partial_json ?? ''
          break
        case 'content_block_stop':
          if (cur?.type === 'tool_use') { try { cur.input = curJson ? JSON.parse(curJson) : {} } catch { cur.input = {} } }
          if (cur) blocks.push(cur)
          cur = null
          break
        case 'message_delta':
          outTok = e.usage?.output_tokens ?? outTok
          stopReason = e.delta?.stop_reason ?? stopReason
          break
      }
    }
  }
  return { blocks, stopReason, inTok, outTok }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // --- Validation synchrone AVANT d'ouvrir le flux (pour renvoyer un vrai statut d'erreur) ---
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
  if (!anthropicKey) return json({ error: 'Clé API non configurée' }, 500)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const auth = await authenticateCaller(admin, req)
  if (!auth.ok) return json({ error: auth.message }, auth.status)

  // Gate rôle : staff (auditor) ou owner. Portail client exclu en v1 (déc. audience).
  const { data: me } = await admin.from('users').select('is_platform_owner').eq('id', auth.profile.id).maybeSingle()
  const isOwner = !!me?.is_platform_owner
  if (auth.profile.role !== 'auditor' && !isOwner) return json({ error: 'Assistant réservé au staff.' }, 403)

  // Gate flag (garde-fou DPA). OFF -> refus.
  const { data: flag } = await admin.from('feature_flags').select('is_globally_enabled').eq('slug', 'support_agent_onboarding').maybeSingle()
  if (!flag?.is_globally_enabled) return json({ error: 'Assistant désactivé.' }, 403)

  let payloadIn: { question?: string; history?: { role: string; text: string }[]; route?: string; module?: string; conversation_id?: string; deep?: boolean }
  try { payloadIn = await req.json() } catch { return json({ error: 'Corps invalide' }, 400) }
  const question = (payloadIn.question || '').toString().trim()
  if (!question) return json({ error: 'question requise' }, 400)

  const audiences = isOwner ? ['all', 'staff', 'client'] : ['all', 'staff']
  const model = payloadIn.deep ? SONNET : HAIKU
  const system = buildSystem()
  const contextLine = `Contexte : page « ${payloadIn.route ?? 'inconnue'} »${payloadIn.module ? `, module ${payloadIn.module}` : ''}.`

  // Historique client (transcript propre) -> messages Anthropic.
  // deno-lint-ignore no-explicit-any
  const messages: any[] = []
  for (const h of (payloadIn.history ?? []).slice(-12)) {
    if (h?.role === 'user' || h?.role === 'assistant') messages.push({ role: h.role, content: (h.text || '').toString().slice(0, 4000) })
  }
  messages.push({ role: 'user', content: `${contextLine}\n\nQuestion : ${question}` })

  // --- Streaming SSE ---
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const sse = async (obj: unknown) => { await writer.write(enc.encode(`data: ${JSON.stringify(obj)}\n\n`)) }

  const startedAt = Date.now()
  ;(async () => {
    let answered = true
    let finalText = ''
    let cumIn = 0, cumOut = 0, cost = 0
    let ok = false
    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const { blocks, stopReason, inTok, outTok } = await streamTurn(anthropicKey, model, { system, tools: TOOLS, max_tokens: MAX_TOKENS, messages }, sse)
        cumIn += inTok; cumOut += outTok
        cost = estimateCostUsd(model, cumIn, cumOut)
        if (cost > BUDGET_USD) { await sse({ type: 'notice', text: 'Limite de la conversation atteinte.' }); break }

        finalText += blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
        if (stopReason !== 'tool_use') { ok = true; break }

        messages.push({ role: 'assistant', content: blocks })
        // deno-lint-ignore no-explicit-any
        const results: any[] = []
        for (const b of blocks) {
          if (b.type !== 'tool_use') continue
          if (b.name === 'report_unresolved') { answered = false; results.push({ type: 'tool_result', tool_use_id: b.id, content: 'ok' }); continue }
          if (b.name === 'suggest_tour') {
            const tid = String((b.input as { tour_id?: string })?.tour_id ?? '')
            const valid = TOUR_IDS.has(tid)
            if (valid) await sse({ type: 'tour', tour_id: tid })
            results.push({ type: 'tool_result', tool_use_id: b.id, content: valid ? 'Tour proposé à l\'utilisateur.' : 'Tour inconnu.' })
            continue
          }
          if (b.name === 'search_help') {
            const out = await searchHelp(admin, String((b.input as { query?: string })?.query ?? ''), audiences)
            results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out).slice(0, 6000) })
            continue
          }
          results.push({ type: 'tool_result', tool_use_id: b.id, content: 'outil inconnu' })
        }
        messages.push({ role: 'user', content: results })
      }

      // Persistance (déc. B) : conversation propriété de l'utilisateur (service_role).
      const transcript = [
        ...(payloadIn.history ?? []).slice(-12).map((h) => ({ role: h.role, text: (h.text || '').toString().slice(0, 4000) })),
        { role: 'user', text: question },
        { role: 'assistant', text: finalText },
      ]
      let convId = payloadIn.conversation_id ?? null
      if (convId) {
        await admin.from('onboarding_conversations').update({ messages: transcript, answered, route: payloadIn.route ?? null, module: payloadIn.module ?? null }).eq('id', convId).eq('user_id', auth.profile.id)
      } else {
        const { data: conv } = await admin.from('onboarding_conversations').insert({ user_id: auth.profile.id, organization_id: auth.profile.organization_id, route: payloadIn.route ?? null, module: payloadIn.module ?? null, messages: transcript, answered }).select('id').single()
        convId = conv?.id ?? null
      }

      void logAiCall({ admin, function_name: 'onboarding-assistant', model, input_tokens: cumIn, output_tokens: cumOut, success: ok, duration_ms: Date.now() - startedAt, organization_id: auth.profile.organization_id, user_id: auth.profile.id })
      await sse({ type: 'done', conversation_id: convId, answered, cost })
    } catch (err) {
      console.error('onboarding-assistant:', err instanceof Error ? err.message : String(err))
      void logAiCall({ admin, function_name: 'onboarding-assistant', model, input_tokens: cumIn, output_tokens: cumOut, success: false, error_message: 'stream error', duration_ms: Date.now() - startedAt, organization_id: auth.profile.organization_id, user_id: auth.profile.id })
      try { await sse({ type: 'error', message: 'Une erreur est survenue. Réessayez.' }) } catch { /* flux déjà fermé */ }
    } finally {
      try { await writer.close() } catch { /* déjà fermé */ }
    }
  })()

  return new Response(readable, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' } })
})
