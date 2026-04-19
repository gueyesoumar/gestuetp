import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Clé API IA non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await admin.auth.getUser(token)
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { mission_id } = await req.json()
    if (!mission_id) {
      return new Response(JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch context
    const { data: mission } = await admin.from('missions').select('name, client_id, framework:frameworks(name)').eq('id', mission_id).single()
    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: ccArr } = await admin.from('cabinet_clients')
      .select('client_name, client_sector, effectifs, exigences_reglementaires, it_systems')
      .eq('client_org_id', mission.client_id).limit(1)
    const cc = ccArr?.[0]

    // Fetch questionnaire responses
    const { data: instances } = await admin.from('questionnaire_instances').select('id, snapshot').eq('mission_id', mission_id).limit(1)
    let qResponses = ''
    if (instances?.[0]) {
      const { data: resps } = await admin.from('questionnaire_responses').select('question_code, response').eq('instance_id', instances[0].id)
      if (resps?.length) {
        const snapshot = instances[0].snapshot as { questions?: { code: string; text: string }[] } | null
        const qTextMap: Record<string, string> = {}
        if (snapshot?.questions) {
          for (const q of snapshot.questions) qTextMap[q.code] = q.text
        }
        qResponses = (resps as { question_code: string; response: Record<string, unknown> }[])
          .map(r => {
            const val = (r.response as { value?: unknown })?.value
            return `- ${r.question_code} "${qTextMap[r.question_code] ?? r.question_code}" => ${String(val ?? 'N/A')}`
          }).join('\n')
      }
    }

    // Fetch existing risks to avoid duplicates
    const { data: existingRisks } = await admin.from('mission_risks').select('title').eq('mission_id', mission_id)
    const existingTitles = (existingRisks ?? []).map((r: { title: string }) => r.title.toLowerCase())

    const prompt = `Tu es un auditeur SI senior. Analyse les réponses du questionnaire client pour identifier les RISQUES INITIAUX pour la mission d'audit.

CONTEXTE:
Client: ${cc?.client_name ?? '?'}, Secteur: ${cc?.client_sector ?? '?'}, Taille: ${cc?.effectifs ?? '?'}
Référentiel: ${mission.framework?.name ?? '?'}
IT: ${JSON.stringify(cc?.it_systems ?? [])}
Réglementations: ${JSON.stringify((cc?.exigences_reglementaires ?? []).map((r: { nom: string }) => r.nom))}

RÉPONSES DU QUESTIONNAIRE CLIENT:
${qResponses || 'Aucune réponse disponible'}

RISQUES DÉJÀ IDENTIFIÉS (ne pas dupliquer):
${existingTitles.length > 0 ? existingTitles.join(', ') : 'Aucun'}

INSTRUCTIONS:
- Identifie les risques CONCRETS révélés par les réponses (absences, faiblesses, lacunes)
- Chaque risque doit être lié à une faiblesse déclarée dans le questionnaire
- Niveaux: "critical" (absence totale d'un élément fondamental), "high" (faiblesse significative), "medium" (amélioration nécessaire), "low" (point d'attention)
- Ne génère PAS de risques génériques non liés aux réponses

Génère un JSON: {"risks":[{"title":"titre court","risk_level":"critical|high|medium|low","description":"description détaillée citant la réponse du questionnaire","source":"code de la question source (ex: GOV-01)"}]}

JSON uniquement, en français. Maximum 8 risques.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      console.error('[smart-risks] Claude error:', claudeRes.status)
      return new Response(JSON.stringify({ error: 'Erreur IA' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    const clean = rawText.replace(/```json|```/g, '').trim()

    let parsed: { risks: { title: string; risk_level: string; description: string; source: string }[] }
    try {
      parsed = JSON.parse(clean)
    } catch {
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch {
          return new Response(JSON.stringify({ risks: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        return new Response(JSON.stringify({ risks: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Filter out duplicates
    const newRisks = (parsed.risks ?? []).filter(r =>
      !existingTitles.includes(r.title.toLowerCase())
    )

    console.log(`[smart-risks] Generated ${newRisks.length} new risks from questionnaire`)

    return new Response(JSON.stringify({ risks: newRisks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('[smart-risks] Error:', err)
    return new Response(JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
