import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const parts: string[] = []
  const chunkSize = 4096
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length)
    let s = ''
    for (let j = i; j < end; j++) {
      s += String.fromCharCode(bytes[j])
    }
    parts.push(s)
  }
  return btoa(parts.join(''))
}

function detectMediaType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'pdf': return 'application/pdf'
    default: return null
  }
}

interface QuestionInput {
  code: string
  label: string
  description: string | null
}

const MAX_DOCS = 3
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Cl\u00e9 API IA non configur\u00e9e' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autoris\u00e9' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await admin.auth.getUser(token)
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Non autoris\u00e9' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { mission_id, questions } = await req.json() as { mission_id: string; questions: QuestionInput[] }

    if (!mission_id || !questions?.length) {
      return new Response(JSON.stringify({ error: 'mission_id et questions requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 1. Contexte client ──────────────────────────────────────────
    const { data: mission } = await admin.from('missions').select('name, client_id, cabinet_id, framework:frameworks(name)').eq('id', mission_id).single()

    let clientContext = ''
    if (mission) {
      const { data: clients } = await admin.from('cabinet_clients')
        .select('client_name, client_sector, effectifs, exigences_reglementaires, it_systems, it_environment')
        .eq('cabinet_id', mission.cabinet_id)
        .eq('client_org_id', mission.client_id)
        .limit(1)

      const cc = clients?.[0]
      if (cc) {
        const regs = (cc.exigences_reglementaires ?? []).map((r: { nom: string }) => r.nom).join(', ')
        clientContext = `Client: ${cc.client_name}, Secteur: ${cc.client_sector ?? '?'}, Taille: ${cc.effectifs ?? '?'}, IT: ${(cc.it_systems ?? []).join(', ')}, Environnement: ${(cc.it_environment ?? []).join(', ')}, R\u00e9glementations: ${regs || 'aucune'}, R\u00e9f\u00e9rentiel: ${mission.framework?.name ?? '?'}`
      }
    }

    // ── 2. T\u00e9l\u00e9charger et encoder les documents ─────────────────────
    const { data: docEntries } = await admin.from('documents')
      .select('file_name, file_path, mime_type, file_size, description')
      .eq('mission_id', mission_id)
      .order('created_at', { ascending: false })
      .limit(10)

    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

    const contentParts: ContentBlock[] = []
    const docDescriptions: string[] = []
    let hasPdf = false

    for (const doc of (docEntries ?? []).slice(0, MAX_DOCS)) {
      // Skip files too large
      if (doc.file_size && doc.file_size > MAX_FILE_SIZE) {
        docDescriptions.push(`[${doc.file_name}] (${(doc.file_size / 1024 / 1024).toFixed(1)} Mo \u2014 trop volumineux pour l'analyse)`)
        continue
      }

      const mediaType = detectMediaType(doc.file_name)
      if (!mediaType) {
        docDescriptions.push(`[${doc.file_name}] (format non support\u00e9 pour l'analyse)`)
        continue
      }

      try {
        const { data: urlData } = admin.storage.from('documents').getPublicUrl(doc.file_path)
        const fileUrl = urlData?.publicUrl
        if (!fileUrl) {
          docDescriptions.push(`[${doc.file_name}] (erreur URL)`)
          continue
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30_000)
        let fileRes: Response
        try {
          fileRes = await fetch(fileUrl, { signal: controller.signal })
        } finally {
          clearTimeout(timeout)
        }

        if (!fileRes.ok) {
          docDescriptions.push(`[${doc.file_name}] (t\u00e9l\u00e9chargement \u00e9chou\u00e9)`)
          continue
        }

        const buffer = await fileRes.arrayBuffer()
        const base64 = bufferToBase64(buffer)

        if (mediaType === 'application/pdf') {
          contentParts.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          })
          hasPdf = true
        } else {
          contentParts.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          })
        }

        docDescriptions.push(`[${doc.file_name}] \u2713 analys\u00e9 (${(buffer.byteLength / 1024 / 1024).toFixed(1)} Mo)`)
        console.log(`[smart-questionnaire] Encoded ${doc.file_name}: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} Mo`)
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError'
        docDescriptions.push(`[${doc.file_name}] (${isAbort ? 'timeout' : 'erreur'})`)
        console.error(`[smart-questionnaire] Error for ${doc.file_name}:`, err)
      }
    }

    // ── 3. Construire le prompt ──────────────────────────────────────
    const docsCtx = docDescriptions.length > 0 ? `\nDOCUMENTS: ${docDescriptions.join('; ')}` : ''
    const questionsText = questions.map(q => `- ${q.code}: ${q.label}${q.description ? ` (${q.description})` : ''}`).join('\n')

    const prompt = `Tu es un auditeur SI senior rigoureux. Tu analyses UNIQUEMENT les documents fournis en pi\u00e8ces jointes pour pr\u00e9-remplir un questionnaire de prise de connaissance.

${clientContext ? `CONTEXTE CLIENT: ${clientContext}\n` : ''}${docsCtx}

${contentParts.length > 0 ? `Tu as re\u00e7u ${contentParts.length} document(s) en pi\u00e8ces jointes. Analyse-les en d\u00e9tail.` : 'Aucun document n\'a pu \u00eatre charg\u00e9.'}

QUESTIONS DU QUESTIONNAIRE:
${questionsText}

R\u00c8GLES STRICTES D'\u00c9VALUATION DES PREUVES:

1. PREUVE DIRECTE (confiance 75-95%) : Le document joint traite directement du sujet.
   Exemple : La PSSI est jointe \u2192 on peut confirmer son existence et analyser son contenu.

2. D\u00c9CLARATION SANS PREUVE (confiance 25-40%) : Un document MENTIONNE l'existence d'un autre document/processus, mais ce document/processus n'est PAS joint.
   Exemple : La PSSI mentionne "un PCA est en place" mais le PCA n'est pas parmi les documents joints.
   \u2192 R\u00e9ponse : "La PSSI (section X) mentionne l'existence d'un PCA, mais le document PCA n'a pas \u00e9t\u00e9 fourni. \u00c0 confirmer."

3. AUCUNE INFORMATION (ne pas r\u00e9pondre) : Aucun document ne mentionne le sujet.

IMPORTANT:
- Ne confonds JAMAIS une d\u00e9claration dans un document avec une preuve concr\u00e8te.
- Si la PSSI dit "nous avons un PCA", ce n'est PAS une preuve que le PCA existe r\u00e9ellement.
- Pr\u00e9cise toujours si ta r\u00e9ponse est bas\u00e9e sur une preuve directe ou une simple d\u00e9claration.
- Liste des documents effectivement joints : ${docDescriptions.filter(d => d.includes('\u2713')).map(d => d.split(']')[0].replace('[', '')).join(', ') || 'aucun'}

G\u00e9n\u00e8re un JSON avec un tableau "answers" contenant pour chaque question r\u00e9pondue :
- "questionCode": le code de la question (ex: "GOV-01")
- "questionLabel": le libell\u00e9 de la question
- "answer": la r\u00e9ponse, EN PR\u00c9CISANT si c'est une preuve directe ou une d\u00e9claration non v\u00e9rifi\u00e9e (2-4 phrases)
- "confidence": 0-100 (STRICT : 75-95 pour preuve directe, 25-40 pour d\u00e9claration sans preuve, jamais plus de 50 sans le document concern\u00e9)
- "sourceDoc": nom du document source principal ou null

Ne r\u00e9ponds PAS aux questions o\u00f9 tu n'as AUCUNE information.
JSON uniquement, en fran\u00e7ais.`

    contentParts.push({ type: 'text', text: prompt })

    // ── 4. Appeler Claude ───────────────────────────────────────────
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    }
    if (hasPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

    const claudeController = new AbortController()
    const claudeTimeout = setTimeout(() => claudeController.abort(), 120_000)

    let claudeRes: Response
    try {
      claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        signal: claudeController.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: contentParts }],
        }),
      })
    } finally {
      clearTimeout(claudeTimeout)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[smart-questionnaire] Claude error:', claudeRes.status, errText.slice(0, 500))
      return new Response(JSON.stringify({ error: `Erreur IA: ${claudeRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 5. Parser la r\u00e9ponse ────────────────────────────────────────
    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    const clean = rawText.replace(/```json|```/g, '').trim()

    let parsed: { answers: { questionCode: string; questionLabel: string; answer: string; confidence: number; sourceDoc: string | null }[] }
    try {
      parsed = JSON.parse(clean)
    } catch {
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch {
          console.error('[smart-questionnaire] Parse failed:', clean.slice(0, 300))
          return new Response(JSON.stringify({ answers: [], docs_analyzed: contentParts.length - 1 }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        return new Response(JSON.stringify({ answers: [], docs_analyzed: contentParts.length - 1 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const answers = (parsed.answers ?? []).map(a => ({ ...a, validated: false }))

    console.log(`[smart-questionnaire] ${contentParts.length - 1} docs analyzed, ${answers.length} answers generated`)

    return new Response(JSON.stringify({ answers, docs_analyzed: contentParts.length - 1 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error('[smart-questionnaire] Error:', message)
    return new Response(
      JSON.stringify({ error: isAbort ? 'D\u00e9lai d\u00e9pass\u00e9 \u2014 r\u00e9essayez' : 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
