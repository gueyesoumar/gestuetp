import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

const SYSTEM_PROMPT = `Tu es un expert en audit SI. Pour chaque contrôle, tu détermines le risk_level, les audit_techniques, et l'auditor_id.

Règles risque :
- "critical" si politique/gouvernance/conformité OU si le questionnaire client révèle une absence totale
- "high" si accès/chiffrement/incident/sauvegarde OU si le questionnaire révèle une faiblesse
- "medium" par défaut
- "low" si le questionnaire client montre une bonne maturité sur ce sujet
- Adapte au contexte client (secteur, taille, réglementations) ET aux réponses du questionnaire
- Les réponses du questionnaire sont des DÉCLARATIONS du client, pas des preuves — elles orientent le risque

Règles techniques (parmi: inspection, entretien, observation, reexecution, echantillon, analytique) :
- Minimum 1 technique par contrôle
- inspection pour vérification documentaire
- entretien pour interviews
- echantillon pour contrôles récurrents (accès, logs)

Règles affectation IMPORTANTES :
- Affecte les contrôles PAR DOMAINE : tous les contrôles d'un même domaine vont au même auditeur
- Si un domaine est trop gros (>30% du total), découpe-le en 2 blocs et affecte chaque bloc à un auditeur différent
- Équilibre le NOMBRE DE CONTRÔLES entre auditeurs (pas les heures)
- Le chef de mission (lead_auditor) prend les domaines de gouvernance/politique

Champ "reasoning" (OBLIGATOIRE) :
- 1 phrase max (≤120 caractères) qui justifie le risk_level retenu pour ce contrôle, en référençant la réponse du questionnaire ou le contexte client si applicable
- Exemples : "Client déclare absence de PSSI formalisée → critique" / "Maturité élevée déclarée sur la GIA → low"

Réponds UNIQUEMENT en JSON : {"controls":[{"id":"...","risk_level":"...","techniques":["..."],"auditor_id":"...","notes":null,"reasoning":"..."}]}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Clé API Anthropic non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Auth
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')
    let callerId: string | null = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user) callerId = user.id
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { mission_id } = await req.json()
    if (!mission_id) {
      return new Response(JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch mission context (compact queries)
    const { data: mission } = await supabaseAdmin
      .from('missions').select('name, framework_id, client_id, cabinet_id, framework:frameworks(name, version)').eq('id', mission_id).single()
    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: domains } = await supabaseAdmin
      .from('domains').select('code, name, controls(id, code, name)').eq('framework_id', mission.framework_id).order('sort_order')

    const { data: ccArr } = await supabaseAdmin
      .from('cabinet_clients').select('client_sector, effectifs, exigences_reglementaires, it_systems').eq('client_org_id', mission.client_id).limit(1)
    const cc = ccArr?.[0] ?? null

    // Fetch questionnaire responses with question text for context
    const { data: instances } = await supabaseAdmin
      .from('questionnaire_instances').select('id, snapshot').eq('mission_id', mission_id).limit(1)
    let qSummary = ''
    if (instances?.[0]) {
      const { data: resps } = await supabaseAdmin
        .from('questionnaire_responses').select('question_code, response').eq('instance_id', instances[0].id)
      if (resps && resps.length > 0) {
        // Get question texts from snapshot
        const snapshot = instances[0].snapshot as { questions?: { code: string; text: string }[] } | null
        const qTextMap: Record<string, string> = {}
        if (snapshot?.questions) {
          for (const q of snapshot.questions) {
            qTextMap[q.code] = q.text
          }
        }
        // Build human-readable summary highlighting weaknesses
        const lines: string[] = []
        for (const r of resps as { question_code: string; response: Record<string, unknown> }[]) {
          const value = (r.response as { value?: unknown })?.value
          const qText = qTextMap[r.question_code] ?? r.question_code
          if (value !== undefined && value !== null) {
            lines.push(`${r.question_code} "${qText}" => ${String(value)}`)
          }
        }
        qSummary = lines.join('\n')
      }
    }

    const { data: risks } = await supabaseAdmin
      .from('mission_risks').select('title, risk_level').eq('mission_id', mission_id)

    const { data: members } = await supabaseAdmin
      .from('mission_members').select('role, user:users!mission_members_user_id_fkey(id, first_name, last_name)').eq('mission_id', mission_id)

    // Build compact control list
    const controls = (domains ?? []).flatMap((d: { code: string; controls: { id: string; code: string; name: string }[] }) =>
      (d.controls ?? []).map(c => `${c.id}|${c.code}|${c.name}|${d.code}`)
    )

    const auditors = (members ?? [])
      .filter((m: { role: string }) => m.role === 'auditor' || m.role === 'lead_auditor')
      .map((m: { user: { id: string; first_name: string; last_name: string }; role: string }) => `${m.user.id}|${m.user.first_name} ${m.user.last_name}|${m.role}`)

    // Compact prompt
    const prompt = `Contexte: ${mission.framework?.name ?? ''} ${mission.framework?.version ?? ''}
Client: secteur=${cc?.client_sector ?? '?'}, taille=${cc?.effectifs ?? '?'}, regs=${JSON.stringify((cc?.exigences_reglementaires ?? []).map((r: { nom: string }) => r.nom))}, IT=${JSON.stringify(cc?.it_systems ?? [])}

RÉPONSES DU QUESTIONNAIRE CLIENT (faiblesses déclarées = risque plus élevé) :
${qSummary.slice(0, 2000) || 'Aucune réponse disponible'}

Risques identifiés en cadrage: ${JSON.stringify((risks ?? []).map((r: { title: string; risk_level: string }) => `${r.risk_level}:${r.title}`))}
Auditeurs (id|nom|role): ${auditors.join('; ')}

IMPORTANT: Utilise les réponses du questionnaire pour ajuster les niveaux de risque :
- Si le client déclare ne PAS avoir un document/processus => risque "high" ou "critical"
- Si le client déclare une faiblesse partielle => risque "high"
- Si le client déclare une bonne maturité => risque "medium" ou "low"

${controls.length} contrôles (id|code|nom|domaine):
${controls.join('\n')}

Génère le JSON pour CHAQUE contrôle. Format: {"controls":[{"id":"uuid","risk_level":"critical|high|medium|low","techniques":["inspection","entretien"],"auditor_id":"uuid","notes":null,"reasoning":"≤120 chars"}]}`

    console.log(`[smart-plan] Calling Claude with ${controls.length} controls...`)

    const startedAt = Date.now()
    const MODEL = 'claude-haiku-4-5-20251001'
    const cabinetIdForLog = (mission as { cabinet_id?: string } | null)?.cabinet_id ?? null

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: '{"controls":[' },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[smart-plan] Claude API error:', claudeRes.status, errText.slice(0, 500))
      void logAiCall({ admin: supabaseAdmin, function_name: 'smart-plan', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}: ${errText.slice(0, 200)}`, duration_ms: Date.now() - startedAt, mission_id, organization_id: cabinetIdForLog, user_id: null })
      return new Response(JSON.stringify({ error: `Erreur Claude: ${claudeRes.status}`, detail: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const claudeData = await claudeRes.json()
    const rawContent = claudeData.content?.[0]?.text ?? ''
    console.log('[smart-plan] Raw response length:', rawContent.length, 'stop_reason:', claudeData.stop_reason)
    void logAiCall({ admin: supabaseAdmin, function_name: 'smart-plan', model: MODEL, input_tokens: claudeData.usage?.input_tokens ?? null, output_tokens: claudeData.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, mission_id, organization_id: cabinetIdForLog, user_id: null })

    // Reconstruct JSON (we prefilled '{"controls":[')
    const fullJson = '{"controls":[' + rawContent

    // Parse response — try multiple strategies
    let parsed: { controls: { id: string; risk_level: string; techniques: string[]; auditor_id: string; notes: string | null; reasoning?: string | null }[] }
    try {
      // Strategy 1: direct parse (ideal case)
      parsed = JSON.parse(fullJson)
    } catch {
      try {
        // Strategy 2: response was truncated — close the JSON
        const fixed = fullJson.replace(/,?\s*$/, ']}')
        parsed = JSON.parse(fixed)
        console.log('[smart-plan] Fixed truncated JSON, got', parsed.controls?.length, 'controls')
      } catch {
        try {
          // Strategy 3: find the largest valid JSON array
          const match = fullJson.match(/\{"controls":\[[\s\S]*?\]\}/)
          if (match) {
            parsed = JSON.parse(match[0])
          } else {
            throw new Error('No valid JSON found')
          }
        } catch {
          console.error('[smart-plan] All parse strategies failed. Raw:', fullJson.slice(0, 500))
          return new Response(JSON.stringify({ error: 'Réponse IA invalide', raw: fullJson.slice(0, 300) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
    }

    // Transform to expected format
    const resultControls = (parsed.controls ?? []).map(c => ({
      id: c.id,
      risk_level: c.risk_level,
      audit_techniques: c.techniques,
      estimated_hours: 2,
      sampling_population: null,
      sampling_size: null,
      notes: c.notes,
      reasoning: typeof c.reasoning === 'string' ? c.reasoning.slice(0, 200) : null,
    }))

    const resultAssignments = (parsed.controls ?? [])
      .filter(c => c.auditor_id)
      .map(c => ({ control_id: c.id, auditor_id: c.auditor_id }))

    console.log(`[smart-plan] Done: ${resultControls.length} controls, ${resultAssignments.length} assignments`)

    return new Response(JSON.stringify({
      success: true,
      controls: resultControls,
      assignments: resultAssignments,
      stats: { total_controls: controls.length, planned: resultControls.length, assigned: resultAssignments.length },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('[smart-plan] Error:', err)
    return new Response(JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
