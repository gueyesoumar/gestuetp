import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface QuestionInput {
  code: string
  label: string
  description: string | null
}

interface AIAnswer {
  questionCode: string
  questionLabel: string
  answer: string
  confidence: number
  sourceDoc: string | null
}

const BATCH_SIZE = 8 // PDFs per Claude call
const MAX_BATCHES = 3 // Up to 24 docs total
const MAX_PDF_SIZE = 32 * 1024 * 1024 // 32 Mo (Anthropic limit per PDF)
const CLAUDE_TIMEOUT_MS = 90_000 // 90s per call

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'url'; url: string; media_type: string } }
  | { type: 'document'; source: { type: 'url'; url: string } | { type: 'file'; file_id: string } }

interface DocEntry {
  file_name: string
  file_path: string
  mime_type: string | null
  file_size: number | null
  anthropic_file_id: string | null
}

const IMAGE_MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
}

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

    // ── 2. Récupérer tous les documents (max BATCH_SIZE * MAX_BATCHES) ──
    const totalCap = BATCH_SIZE * MAX_BATCHES
    const { data: allDocs } = await admin.from('documents')
      .select('file_name, file_path, mime_type, file_size, anthropic_file_id')
      .eq('mission_id', mission_id)
      .order('created_at', { ascending: false })
      .limit(totalCap + 5) // +5 to know if there are more being skipped

    const docList = (allDocs ?? []) as DocEntry[]
    const docsToProcess = docList.slice(0, totalCap)
    const docsSkipped = docList.length > totalCap
      ? docList.slice(totalCap).map((d) => d.file_name)
      : []

    // Split into batches of BATCH_SIZE
    const batches: DocEntry[][] = []
    for (let i = 0; i < docsToProcess.length; i += BATCH_SIZE) {
      batches.push(docsToProcess.slice(i, i + BATCH_SIZE))
    }

    if (batches.length === 0) {
      return new Response(JSON.stringify({ answers: [], docs_analyzed: 0, docs_total: 0, docs_skipped: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 3. Process each batch sequentially ────────────────────────────
    const mergedAnswers = new Map<string, AIAnswer>()
    const analyzedDocNames: string[] = []
    const failedDocs: { name: string; reason: string }[] = []
    const questionsText = questions.map((q) => `- ${q.code}: ${q.label}${q.description ? ` (${q.description})` : ''}`).join('\n')

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      const contentParts: ContentBlock[] = []
      const batchDescriptions: string[] = []
      let hasPdf = false
      let useFilesApi = false

      for (const doc of batch) {
        const ext = doc.file_name.split('.').pop()?.toLowerCase() ?? ''
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
        const isPdf = ext === 'pdf'

        if (!isImage && !isPdf) {
          failedDocs.push({ name: doc.file_name, reason: 'format non supporté' })
          continue
        }

        // Prefer Files API
        if (isPdf && doc.anthropic_file_id) {
          contentParts.push({
            type: 'document',
            source: { type: 'file', file_id: doc.anthropic_file_id },
          })
          hasPdf = true
          useFilesApi = true
          analyzedDocNames.push(doc.file_name)
          batchDescriptions.push(`[${doc.file_name}] ✓ Files API`)
          continue
        }

        if (isPdf && doc.file_size && doc.file_size > MAX_PDF_SIZE) {
          failedDocs.push({ name: doc.file_name, reason: `trop volumineux (${(doc.file_size / 1024 / 1024).toFixed(1)} Mo)` })
          continue
        }

        const { data: signedData, error: signErr } = await admin.storage
          .from('documents')
          .createSignedUrl(doc.file_path, 3600)

        if (signErr || !signedData?.signedUrl) {
          failedDocs.push({ name: doc.file_name, reason: 'erreur URL signée' })
          continue
        }

        if (isPdf) {
          contentParts.push({
            type: 'document',
            source: { type: 'url', url: signedData.signedUrl },
          })
          hasPdf = true
        } else {
          contentParts.push({
            type: 'image',
            source: { type: 'url', url: signedData.signedUrl, media_type: IMAGE_MEDIA_TYPES[ext] ?? 'image/jpeg' },
          })
        }

        analyzedDocNames.push(doc.file_name)
        batchDescriptions.push(`[${doc.file_name}] ✓`)
      }

      if (contentParts.length === 0) {
        console.log(`[smart-questionnaire] Batch ${batchIdx + 1}/${batches.length}: no usable docs, skipping`)
        continue
      }

      // Build prompt for this batch
      const docsCtx = batchDescriptions.join('; ')
      const prompt = `Tu es un auditeur SI senior rigoureux. Tu analyses UNIQUEMENT les documents fournis en pièces jointes pour pré-remplir un questionnaire de prise de connaissance.

${clientContext ? `CONTEXTE CLIENT: ${clientContext}\n` : ''}
DOCUMENTS DE CE LOT (${batchIdx + 1}/${batches.length}): ${docsCtx}

QUESTIONS DU QUESTIONNAIRE:
${questionsText}

RÈGLES STRICTES D'ÉVALUATION DES PREUVES:

1. PREUVE DIRECTE (confiance 75-95%) : Le document joint traite directement du sujet.
   Exemple : La PSSI est jointe → on peut confirmer son existence et analyser son contenu.

2. DÉCLARATION SANS PREUVE (confiance 25-40%) : Un document MENTIONNE l'existence d'un autre document/processus, mais ce document/processus n'est PAS joint.

3. AUCUNE INFORMATION (ne pas répondre) : Aucun document ne mentionne le sujet.

IMPORTANT:
- Ne réponds qu'aux questions où tu trouves une information dans CES documents.
- Ne réponds PAS aux questions où tu n'as AUCUNE information dans ce lot.
- Ne confonds JAMAIS une déclaration avec une preuve concrète.

Génère un JSON avec un tableau "answers" contenant pour chaque question répondue :
- "questionCode": le code de la question (ex: "ORG-01")
- "questionLabel": le libellé de la question
- "answer": la réponse, EN PRÉCISANT si c'est une preuve directe ou une déclaration non vérifiée (2-4 phrases)
- "confidence": 0-100 (STRICT : 75-95 pour preuve directe, 25-40 pour déclaration sans preuve)
- "sourceDoc": nom du document source principal ou null

JSON uniquement, en français.`

      contentParts.push({ type: 'text', text: prompt })

      // Call Claude
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
      const claudeTimeout = setTimeout(() => claudeController.abort(), CLAUDE_TIMEOUT_MS)

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
      } catch (err) {
        clearTimeout(claudeTimeout)
        const isAbort = err instanceof Error && err.name === 'AbortError'
        console.error(`[smart-questionnaire] Batch ${batchIdx + 1} ${isAbort ? 'timeout' : 'error'}:`, err)
        for (const doc of batch) failedDocs.push({ name: doc.file_name, reason: isAbort ? 'timeout IA' : 'erreur IA' })
        continue
      }
      clearTimeout(claudeTimeout)

      if (!claudeRes.ok) {
        const errText = await claudeRes.text()
        console.error(`[smart-questionnaire] Batch ${batchIdx + 1} Claude error:`, claudeRes.status, errText.slice(0, 500))
        for (const doc of batch) failedDocs.push({ name: doc.file_name, reason: `Claude ${claudeRes.status}` })
        continue
      }

      // Parse response
      const claudeData = await claudeRes.json()
      const rawText = claudeData.content?.[0]?.text ?? ''
      const clean = rawText.replace(/```json|```/g, '').trim()

      let parsed: { answers?: AIAnswer[] } = {}
      try {
        parsed = JSON.parse(clean)
      } catch {
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) {
          try { parsed = JSON.parse(match[0]) } catch {
            console.error(`[smart-questionnaire] Batch ${batchIdx + 1} parse failed`)
          }
        }
      }

      // Merge: keep highest confidence per questionCode
      for (const a of parsed.answers ?? []) {
        const existing = mergedAnswers.get(a.questionCode)
        if (!existing || a.confidence > existing.confidence) {
          mergedAnswers.set(a.questionCode, a)
        }
      }

      console.log(`[smart-questionnaire] Batch ${batchIdx + 1}/${batches.length} done: ${parsed.answers?.length ?? 0} answers`)
    }

    const answers = [...mergedAnswers.values()].map((a) => ({ ...a, validated: false }))

    console.log(`[smart-questionnaire] Total: ${analyzedDocNames.length}/${docList.length} docs analyzed, ${answers.length} answers, ${batches.length} batch(es)`)

    return new Response(JSON.stringify({
      answers,
      docs_analyzed: analyzedDocNames.length,
      docs_total: docList.length,
      docs_analyzed_names: analyzedDocNames,
      docs_skipped: docsSkipped,
      docs_failed: failedDocs,
      batches: batches.length,
    }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[smart-questionnaire] Error:', message)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
