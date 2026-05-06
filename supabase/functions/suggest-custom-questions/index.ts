import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

/**
 * Edge Function : suggest-custom-questions
 *
 * Genere des suggestions de questions custom pour un questionnaire de cadrage,
 * via Claude. L'auditeur fournit un prompt libre + le contexte de la mission.
 *
 * Securite :
 *  - Cle Anthropic cote serveur uniquement
 *  - Authentification par token Supabase (auteur connecte)
 *  - Le prompt est tronque a 2000 caracteres
 *  - La reponse JSON est validee strictement avant retour
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_PROMPT_LENGTH = 2000
const MAX_SUGGESTIONS = 8

const ALLOWED_TYPES = new Set([
  'text', 'textarea', 'boolean', 'date', 'number', 'scale_percent', 'file', 'organigramme',
])

interface Suggestion {
  code: string
  text: string
  question_type: string
  section: string | null
  rationale: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autorise' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return jsonResponse({ error: 'Non autorise' }, 401)

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) return jsonResponse({ error: 'Cle API Anthropic non configuree' }, 500)

    const body = await req.json() as {
      mission_id?: string
      framework_id?: string
      prompt?: string
      existing_codes?: string[]
      sections?: Array<{ code: string; label?: string }>
    }

    const userPrompt = (body.prompt ?? '').trim().slice(0, MAX_PROMPT_LENGTH)
    if (userPrompt.length === 0) return jsonResponse({ error: 'prompt requis' }, 400)
    if (!body.framework_id) return jsonResponse({ error: 'framework_id requis' }, 400)

    // Charger le contexte mission/client (optionnel, mais ameliore la pertinence)
    let missionContext = ''
    if (body.mission_id) {
      const { data: mission } = await admin
        .from('missions')
        .select('id, name, framework_id, client_id, cabinet_id')
        .eq('id', body.mission_id)
        .maybeSingle()
      if (mission) {
        const { data: client } = await admin
          .from('cabinet_clients')
          .select('client_sector, effectifs, nombre_sites, client_country, activites_principales, it_environment')
          .eq('client_org_id', mission.client_id)
          .eq('cabinet_id', mission.cabinet_id)
          .maybeSingle()
        if (client) {
          const parts: string[] = []
          if (client.client_sector) parts.push(`Secteur : ${client.client_sector}`)
          if (client.effectifs) parts.push(`Effectifs : ${client.effectifs}`)
          if (client.nombre_sites) parts.push(`Sites : ${client.nombre_sites}`)
          if (client.client_country) parts.push(`Pays : ${client.client_country}`)
          if (Array.isArray(client.activites_principales) && client.activites_principales.length > 0) {
            parts.push(`Activites : ${client.activites_principales.slice(0, 5).join(', ')}`)
          }
          if (Array.isArray(client.it_environment) && client.it_environment.length > 0) {
            parts.push(`Environnement IT : ${client.it_environment.slice(0, 5).join(', ')}`)
          }
          missionContext = parts.join(' &bull; ')
        }
      }
    }

    // Charger le nom du referentiel pour contextualiser
    const { data: framework } = await admin
      .from('frameworks')
      .select('name, slug')
      .eq('id', body.framework_id)
      .maybeSingle()
    const frameworkName = framework?.name ?? 'Inconnu'

    const sectionsList = (body.sections ?? [])
      .map((s) => `- ${s.code}${s.label ? ` (${s.label})` : ''}`)
      .join('\n') || '(aucune section connue)'

    const existingCodes = (body.existing_codes ?? []).slice(0, 200).join(', ') || '(aucune)'

    const prompt = buildPrompt({
      userPrompt,
      frameworkName,
      missionContext,
      sectionsList,
      existingCodes,
    })

    const startedAt = Date.now()
    let claudeRes: Response
    try {
      claudeRes = await fetch(`${ANTHROPIC_API}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 3000,
          messages: [
            { role: 'user', content: prompt },
            { role: 'assistant', content: '{"suggestions":[' },
          ],
        }),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'fetch error'
      void logAiCall({
        admin, function_name: 'suggest-custom-questions', model: MODEL,
        input_tokens: null, output_tokens: null, success: false,
        error_message: 'fetch error', duration_ms: Date.now() - startedAt,
        organization_id: null, mission_id: body.mission_id ?? null, user_id: caller.id,
      })
      return jsonResponse({ error: `Appel Claude echoue : ${message}` }, 502)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[suggest-custom-questions] Claude error:', claudeRes.status, errText.slice(0, 500))
      void logAiCall({
        admin, function_name: 'suggest-custom-questions', model: MODEL,
        input_tokens: null, output_tokens: null, success: false,
        error_message: `${claudeRes.status}`, duration_ms: Date.now() - startedAt,
        organization_id: null, mission_id: body.mission_id ?? null, user_id: caller.id,
      })
      return jsonResponse({ error: `Erreur Claude (${claudeRes.status})` }, 502)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    const fullJson = '{"suggestions":[' + rawText

    void logAiCall({
      admin, function_name: 'suggest-custom-questions', model: MODEL,
      input_tokens: claudeData.usage?.input_tokens ?? null,
      output_tokens: claudeData.usage?.output_tokens ?? null,
      success: true, duration_ms: Date.now() - startedAt,
      organization_id: null, mission_id: body.mission_id ?? null, user_id: caller.id,
    })

    let parsed: { suggestions: unknown[] }
    try {
      parsed = JSON.parse(fullJson) as { suggestions: unknown[] }
    } catch {
      const match = fullJson.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) as { suggestions: unknown[] } } catch {
          return jsonResponse({ error: 'Reponse IA non parsable. Reformulez votre demande.' }, 502)
        }
      } else {
        return jsonResponse({ error: 'Reponse IA non parsable.' }, 502)
      }
    }

    const validSections = new Set((body.sections ?? []).map((s) => s.code))
    const seenCodes = new Set((body.existing_codes ?? []).map((c) => c.toUpperCase()))
    const cleaned: Suggestion[] = []
    for (const item of parsed.suggestions ?? []) {
      if (cleaned.length >= MAX_SUGGESTIONS) break
      if (typeof item !== 'object' || item === null) continue
      const it = item as Record<string, unknown>
      const code = typeof it.code === 'string' ? it.code.trim().toUpperCase().slice(0, 40) : ''
      const text = typeof it.text === 'string' ? it.text.trim().slice(0, 500) : ''
      const qtype = typeof it.question_type === 'string' ? it.question_type : 'textarea'
      const section = typeof it.section === 'string' ? it.section.trim().toUpperCase() : ''
      const rationale = typeof it.rationale === 'string' ? it.rationale.trim().slice(0, 300) : ''
      if (code.length === 0 || text.length === 0) continue
      if (seenCodes.has(code)) continue
      const finalType = ALLOWED_TYPES.has(qtype) ? qtype : 'textarea'
      const finalSection = section && validSections.has(section) ? section : null
      seenCodes.add(code)
      cleaned.push({ code, text, question_type: finalType, section: finalSection, rationale })
    }

    return jsonResponse({
      suggestions: cleaned,
      tokens: {
        input: claudeData.usage?.input_tokens ?? 0,
        output: claudeData.usage?.output_tokens ?? 0,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[suggest-custom-questions] error:', message)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})

interface PromptParams {
  userPrompt: string
  frameworkName: string
  missionContext: string
  sectionsList: string
  existingCodes: string
}

function buildPrompt(p: PromptParams): string {
  return `Tu es un auditeur senior en securite des systemes d'information.
Ta tache : proposer ${MAX_SUGGESTIONS} questions au maximum a ajouter dans un questionnaire de cadrage d'audit, en t'appuyant sur le contexte mission ci-dessous.

REFERENTIEL : ${p.frameworkName}
${p.missionContext ? `CONTEXTE CLIENT : ${p.missionContext}\n` : ''}DEMANDE DE L'AUDITEUR :
${p.userPrompt}

SECTIONS DISPONIBLES DU QUESTIONNAIRE :
${p.sectionsList}

CODES DEJA UTILISES (a ne pas reproduire) :
${p.existingCodes}

CONSIGNES
1. Genere entre 3 et ${MAX_SUGGESTIONS} questions concises et actionnables, formulees comme un auditeur les poserait au client.
2. Pour chaque question, choisis la meilleure section parmi celles listees (champ "section"). Si vraiment aucune section ne convient, mets section a null.
3. Le code doit etre court, en majuscules, sans accent, et unique (ex: "SOC-1", "FRN-2", "CRYPTO-3"). Pas de prefixe CUSTOM-.
4. Le question_type doit etre l'un de : text, textarea, boolean, date, number, scale_percent, file, organigramme. Privilegie textarea pour les questions ouvertes, boolean pour oui/non, scale_percent pour les niveaux de maturite.
5. Le champ rationale (1 phrase courte) explique a l'auditeur pourquoi cette question est utile dans ce contexte.
6. Reponds UNIQUEMENT en JSON strict, sans texte avant ni apres. Le JSON commence par {"suggestions":[ et se termine par ]}.

FORMAT
{
  "suggestions": [
    {
      "code": "SOC-1",
      "text": "Comment pilotez-vous le prestataire qui opere votre SOC externalise ?",
      "question_type": "textarea",
      "section": "FRN",
      "rationale": "Permet de qualifier le niveau de maitrise du SOC infogere."
    }
  ]
}

Commence directement par le JSON.`
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
