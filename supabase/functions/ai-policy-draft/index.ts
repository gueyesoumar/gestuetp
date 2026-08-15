import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { CLAUDE_SONNET } from '../_shared/models.ts'

/**
 * ai-policy-draft — rédige le brouillon d'une politique de sécurité (Gëstu Policy,
 * provenance `ai`) depuis un intitulé + une dimension de gouvernance (+ référentiel
 * optionnel). Renvoie { content } en Markdown. Clé Anthropic serveur uniquement.
 */

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) return json({ error: 'Clé API IA non configurée' }, 500)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile

    const { title, dimension_label, framework } = await req.json() as { title?: string; dimension_label?: string; framework?: string }
    if (!title?.trim()) return json({ error: 'Intitulé requis' }, 400)

    const prompt = `Tu es un expert en gouvernance de la sécurité de l'information. Rédige une POLITIQUE complète, concrète et prête à réviser, en français.

Intitulé : ${title.trim()}
${dimension_label ? `Dimension de gouvernance : ${dimension_label}` : ''}
${framework ? `Référentiel de référence : ${framework}` : ''}

Structure attendue (Markdown) :
# ${title.trim()}
## 1. Objet et champ d'application
## 2. Rôles et responsabilités
## 3. Principes et règles
## 4. Mesures de mise en œuvre
## 5. Contrôle, revue et sanctions

Contenu actionnable, pas de placeholders vagues. Réponds UNIQUEMENT avec le corps de la politique en Markdown, sans préambule ni commentaire.`

    const startedAt = Date.now()
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: CLAUDE_SONNET, max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
    })

    if (!claudeRes.ok) {
      console.error('[ai-policy-draft] Claude error:', claudeRes.status)
      void logAiCall({ admin, function_name: 'ai-policy-draft', model: CLAUDE_SONNET, input_tokens: null, output_tokens: null, success: false, error_message: `Claude ${claudeRes.status}`, duration_ms: Date.now() - startedAt, mission_id: null, organization_id: caller.organization_id, user_id: caller.id })
      return json({ error: 'Erreur IA' }, 502)
    }

    const claudeData = await claudeRes.json()
    void logAiCall({ admin, function_name: 'ai-policy-draft', model: CLAUDE_SONNET, input_tokens: claudeData.usage?.input_tokens ?? null, output_tokens: claudeData.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, mission_id: null, organization_id: caller.organization_id, user_id: caller.id })
    const content = (claudeData.content?.[0]?.text ?? '').trim()
    return json({ content })
  } catch (err) {
    console.error('[ai-policy-draft] Error:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
