import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-question-controls
 *
 * Écriture du mapping question de cadrage ↔ contrôle (table question_controls, qui
 * n'a que des policies SELECT). Réservé au platform_owner ; service_role côté serveur.
 *
 * Body JSON :
 *   { action: 'set',    question_id, control_id, weight (1|2|3) }
 *   { action: 'remove', question_id, control_id }
 */

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { admin } = guard

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')
    const questionId = String(body.question_id ?? '')
    const controlId = String(body.control_id ?? '')
    if (!questionId || !controlId) return jsonResponse({ error: 'question_id et control_id requis' }, 400)

    if (action === 'set') {
      const weight = Number(body.weight ?? 1)
      if (![1, 2, 3].includes(weight)) return jsonResponse({ error: 'weight invalide (1, 2 ou 3)' }, 400)
      const { error } = await admin.from('question_controls')
        .upsert({ question_id: questionId, control_id: controlId, weight }, { onConflict: 'question_id,control_id' })
      if (error) { console.error('[admin-question-controls] set:', error.message); return jsonResponse({ error: 'Écriture impossible' }, 500) }
      return jsonResponse({ ok: true })
    }

    if (action === 'remove') {
      const { error } = await admin.from('question_controls')
        .delete().eq('question_id', questionId).eq('control_id', controlId)
      if (error) { console.error('[admin-question-controls] remove:', error.message); return jsonResponse({ error: 'Suppression impossible' }, 500) }
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'action inconnue' }, 400)
  } catch (err) {
    console.error('[admin-question-controls] error:', err instanceof Error ? err.message : err)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})
