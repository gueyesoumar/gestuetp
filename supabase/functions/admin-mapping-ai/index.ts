import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner } from '../_shared/auth-platform-owner.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'
import { CLAUDE_HAIKU } from '../_shared/models.ts'

/**
 * Edge Function : admin-mapping-ai
 *
 * Propose (sans écrire) le mapping question de cadrage ↔ contrôles d'un référentiel.
 * Pour chaque question du template actif, l'IA suggère les contrôles pertinents et
 * un poids (1 contexte / 2 partiel / 3 preuve forte). Les paires déjà liées sont
 * exclues. L'humain valide côté admin (bouton « Accepter »).
 *
 * Body JSON : { framework_id: string }
 * Sécurité : platform_owner uniquement ; clé Anthropic côté serveur.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const MODEL = CLAUDE_HAIKU
const MAX_CONTROLS = 300

interface QRow { id: string; code: string; text: string; description: string | null }
interface CRow { id: string; code: string; name: string; description: string | null }

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function buildPrompt(questions: QRow[], controls: CRow[]): string {
  const qList = questions.map((q) => `${q.code} | ${q.text}${q.description ? ' — ' + q.description.slice(0, 120) : ''}`).join('\n')
  const cList = controls.map((c) => `${c.code} | ${c.name}${c.description ? ' — ' + c.description.slice(0, 120) : ''}`).join('\n')
  return `Tu relies des QUESTIONS d'un questionnaire de cadrage aux CONTRÔLES d'un référentiel d'audit SI qu'elles permettent d'évaluer.

Pour CHAQUE question, choisis 0 à 4 contrôles RÉELLEMENT pertinents (pas de lien faible) et un poids :
- 3 = preuve forte (la réponse établit directement la conformité du contrôle)
- 2 = partiel (la réponse éclaire une partie du contrôle)
- 1 = contexte (la réponse donne du contexte utile)

QUESTIONS (code | texte) :
${qList}

CONTRÔLES (code | nom — description) :
${cList}

Réponds UNIQUEMENT avec un tableau JSON, sans texte autour, de la forme :
[{"q":"GOV-02","c":"REG 1-4","w":3}, {"q":"GOV-02","c":"REG 1-1","w":2}, ...]
"q" = code de question, "c" = code de contrôle (exactement comme ci-dessus), "w" ∈ {1,2,3}. Commence par [`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { admin, owner } = guard

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
  if (!anthropicKey) return jsonResponse({ error: 'Clé API Anthropic non configurée' }, 500)

  try {
    const body = await req.json().catch(() => ({}))
    const frameworkId = String(body.framework_id ?? '')
    if (!frameworkId) return jsonResponse({ error: 'framework_id requis' }, 400)

    // Template actif → questions
    const { data: tpl } = await admin.from('questionnaire_templates')
      .select('id').eq('framework_id', frameworkId).eq('is_active', true).limit(1).maybeSingle()
    if (!tpl) return jsonResponse({ suggestions: [], error: 'Aucun questionnaire actif pour ce référentiel.' })
    const { data: qRows } = await admin.from('questions')
      .select('id, code, text, description').eq('template_id', tpl.id).order('sort_order')
    const questions = (qRows ?? []) as QRow[]
    if (questions.length === 0) return jsonResponse({ suggestions: [] })

    // Référentiel → domaines → contrôles
    const { data: domains } = await admin.from('domains').select('id').eq('framework_id', frameworkId)
    const domainIds = (domains ?? []).map((d: { id: string }) => d.id)
    if (domainIds.length === 0) return jsonResponse({ suggestions: [] })
    const { data: cRows } = await admin.from('controls')
      .select('id, code, name, description').in('domain_id', domainIds).order('code')
    const controls = ((cRows ?? []) as CRow[]).slice(0, MAX_CONTROLS)
    if (controls.length === 0) return jsonResponse({ suggestions: [] })

    // Liens déjà existants (pour les exclure des suggestions)
    const questionIds = questions.map((q) => q.id)
    const { data: existing } = await admin.from('question_controls')
      .select('question_id, control_id').in('question_id', questionIds)
    const existingSet = new Set((existing ?? []).map((l: { question_id: string; control_id: string }) => `${l.question_id}:${l.control_id}`))

    const startedAt = Date.now()
    let claudeRes: Response
    try {
      claudeRes = await fetch(`${ANTHROPIC_API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8000,
          messages: [
            { role: 'user', content: buildPrompt(questions, controls) },
            { role: 'assistant', content: '[' },
          ],
        }),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'fetch error'
      void logAiCall({ admin, function_name: 'admin-mapping-ai', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: 'fetch error', duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })
      return jsonResponse({ error: `Appel Claude échoué: ${message}` }, 502)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      void logAiCall({ admin, function_name: 'admin-mapping-ai', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}`, duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })
      return jsonResponse({ error: `Erreur Claude (${claudeRes.status}): ${errText.slice(0, 180)}` }, 502)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    void logAiCall({ admin, function_name: 'admin-mapping-ai', model: MODEL, input_tokens: claudeData.usage?.input_tokens ?? null, output_tokens: claudeData.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })

    let parsed: Array<{ q: string; c: string; w: number }>
    try {
      parsed = JSON.parse('[' + rawText)
    } catch {
      const match = ('[' + rawText).match(/\[[\s\S]*\]/)
      if (!match) return jsonResponse({ error: 'Réponse IA non parsable.' }, 502)
      try { parsed = JSON.parse(match[0]) } catch { return jsonResponse({ error: 'Réponse IA non parsable.' }, 502) }
    }

    const qIdByCode = new Map(questions.map((q) => [q.code, q.id]))
    const cIdByCode = new Map(controls.map((c) => [c.code, c.id]))
    const seen = new Set<string>()
    const suggestions = parsed
      .map((item) => {
        const question_id = qIdByCode.get(String(item?.q))
        const control_id = cIdByCode.get(String(item?.c))
        const weight = Number(item?.w)
        return question_id && control_id && [1, 2, 3].includes(weight) ? { question_id, control_id, weight } : null
      })
      .filter((s): s is { question_id: string; control_id: string; weight: number } => {
        if (!s) return false
        const key = `${s.question_id}:${s.control_id}`
        if (existingSet.has(key) || seen.has(key)) return false
        seen.add(key)
        return true
      })

    return jsonResponse({ suggestions })
  } catch (err) {
    console.error('[admin-mapping-ai] error:', err instanceof Error ? err.message : err)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})
