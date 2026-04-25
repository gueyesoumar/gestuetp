import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface QuestionInput {
  code: string
  label: string
  description: string | null
}

const MAX_DOCS = 5
const MAX_PDFS = 1 // Anthropic URL mode limit per request
const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10 Mo

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
        clientContext = `Client: ${cc.client_name}, Secteur: ${cc.client_sector ?? '?'}, Taille: ${cc.effectifs ?? '?'}, IT: ${(cc.it_systems ?? []).join(', ')}, Environnement: ${(cc.it_environment ?? []).join(', ')}, Réglementations: ${regs || 'aucune'}, Référentiel: ${mission.framework?.name ?? '?'}`
      }
    }

    // ── 2. Récupérer les documents via URL signée (pas de base64 inline) ──
    const { data: docEntries } = await admin.from('documents')
      .select('file_name, file_path, mime_type, file_size, anthropic_file_id')
      .eq('mission_id', mission_id)
      .order('created_at', { ascending: false })
      .limit(10)

    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'url'; url: string; media_type: string } }
      | { type: 'document'; source: { type: 'url'; url: string } | { type: 'file'; file_id: string } }

    const contentParts: ContentBlock[] = []
    const docDescriptions: string[] = []
    let hasPdf = false
    let useFilesApi = false
    let pdfCount = 0
    const imageMediaTypes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    }

    for (const doc of (docEntries ?? []).slice(0, MAX_DOCS)) {
      const ext = doc.file_name.split('.').pop()?.toLowerCase() ?? ''
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
      const isPdf = ext === 'pdf'

      if (!isImage && !isPdf) {
        docDescriptions.push(`[${doc.file_name}] (format non supporté)`)
        continue
      }

      // Strategy: prefer Files API (file_id) > signed URL fallback
      if (isPdf && doc.anthropic_file_id) {
        contentParts.push({
          type: 'document',
          source: { type: 'file', file_id: doc.anthropic_file_id },
        })
        hasPdf = true
        useFilesApi = true
        pdfCount++
        const sizeMb = doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)}Mo` : '?'
        docDescriptions.push(`[${doc.file_name}] ✓ via Files API (${sizeMb})`)
        continue
      }

      if (isPdf) {
        if (pdfCount >= MAX_PDFS) {
          docDescriptions.push(`[${doc.file_name}] (limité à ${MAX_PDFS} PDF par analyse en mode URL)`)
          continue
        }
        if (doc.file_size && doc.file_size > MAX_PDF_SIZE) {
          docDescriptions.push(`[${doc.file_name}] (trop volumineux : ${(doc.file_size / 1024 / 1024).toFixed(1)}Mo)`)
          continue
        }
      }

      const { data: signedData, error: signErr } = await admin.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600)

      if (signErr || !signedData?.signedUrl) {
        docDescriptions.push(`[${doc.file_name}] (erreur URL signée)`)
        continue
      }

      if (isPdf) {
        contentParts.push({
          type: 'document',
          source: { type: 'url', url: signedData.signedUrl },
        })
        hasPdf = true
        pdfCount++
      } else {
        contentParts.push({
          type: 'image',
          source: { type: 'url', url: signedData.signedUrl, media_type: imageMediaTypes[ext] ?? 'image/jpeg' },
        })
      }

      const sizeMb = doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)}Mo` : '?'
      docDescriptions.push(`[${doc.file_name}] ✓ (${sizeMb})`)
      console.log(`[smart-questionnaire] Added ${doc.file_name} via signed URL (${sizeMb})`)
    }

    // ── 3. Construire le prompt ──────────────────────────────────────
    const docsCtx = docDescriptions.length > 0 ? `\nDOCUMENTS: ${docDescriptions.join('; ')}` : ''
    const questionsText = questions.map(q => `- ${q.code}: ${q.label}${q.description ? ` (${q.description})` : ''}`).join('\n')

    const prompt = `Tu es un auditeur SI senior rigoureux. Tu analyses UNIQUEMENT les documents fournis en pièces jointes pour pré-remplir un questionnaire de prise de connaissance.

${clientContext ? `CONTEXTE CLIENT: ${clientContext}\n` : ''}${docsCtx}

${contentParts.length > 0 ? `Tu as reçu ${contentParts.length} document(s) en pièces jointes. Analyse-les en détail.` : 'Aucun document n\'a pu être chargé.'}

QUESTIONS DU QUESTIONNAIRE:
${questionsText}

RÈGLES STRICTES D'ÉVALUATION DES PREUVES:

1. PREUVE DIRECTE (confiance 75-95%) : Le document joint traite directement du sujet.
   Exemple : La PSSI est jointe → on peut confirmer son existence et analyser son contenu.

2. DÉCLARATION SANS PREUVE (confiance 25-40%) : Un document MENTIONNE l'existence d'un autre document/processus, mais ce document/processus n'est PAS joint.
   Exemple : La PSSI mentionne "un PCA est en place" mais le PCA n'est pas parmi les documents joints.
   → Réponse : "La PSSI (section X) mentionne l'existence d'un PCA, mais le document PCA n'a pas été fourni. À confirmer."

3. AUCUNE INFORMATION (ne pas répondre) : Aucun document ne mentionne le sujet.

IMPORTANT:
- Ne confonds JAMAIS une déclaration dans un document avec une preuve concrète.
- Si la PSSI dit "nous avons un PCA", ce n'est PAS une preuve que le PCA existe réellement.
- Précise toujours si ta réponse est basée sur une preuve directe ou une simple déclaration.
- Liste des documents effectivement joints : ${docDescriptions.filter(d => d.includes('✓')).map(d => d.split(']')[0].replace('[', '')).join(', ') || 'aucun'}

Génère un JSON avec un tableau "answers" contenant pour chaque question répondue :
- "questionCode": le code de la question (ex: "GOV-01")
- "questionLabel": le libellé de la question
- "answer": la réponse, EN PRÉCISANT si c'est une preuve directe ou une déclaration non vérifiée (2-4 phrases)
- "confidence": 0-100 (STRICT : 75-95 pour preuve directe, 25-40 pour déclaration sans preuve, jamais plus de 50 sans le document concerné)
- "sourceDoc": nom du document source principal ou null

Ne réponds PAS aux questions où tu n'as AUCUNE information.
JSON uniquement, en français.`

    contentParts.push({ type: 'text', text: prompt })

    // ── 4. Appeler Claude ───────────────────────────────────────────
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    }
    const betaFlags: string[] = []
    if (hasPdf) betaFlags.push('pdfs-2024-09-25')
    if (useFilesApi) betaFlags.push('files-api-2025-04-14')
    if (betaFlags.length > 0) headers['anthropic-beta'] = betaFlags.join(',')

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

    // ── 5. Parser la réponse ────────────────────────────────────────
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
      JSON.stringify({ error: isAbort ? 'Délai dépassé — réessayez' : 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
