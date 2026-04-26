import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAiCall } from '../_shared/log-ai-call.ts'
import { corsHeaders } from '../_shared/cors.ts'

type SupabaseAdmin = ReturnType<typeof createClient>

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

const BATCH_SIZE = 4 // PDFs per Claude call (smaller = more reliable for big docs)
const MAX_BATCHES = 6 // Up to 24 docs total
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

interface BatchResult {
  answers: AIAnswer[]
  analyzed: string[]
  failed: { name: string; reason: string }[]
}

const IMAGE_MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
}

/**
 * Build content blocks for a list of documents (resolves URLs / Files API).
 * Returns the parts + names of docs successfully prepared + immediate failures.
 */
async function prepareDocs(
  admin: SupabaseAdmin,
  docs: DocEntry[],
): Promise<{ parts: ContentBlock[]; names: string[]; failed: { name: string; reason: string }[]; hasPdf: boolean; useFilesApi: boolean }> {
  const parts: ContentBlock[] = []
  const names: string[] = []
  const failed: { name: string; reason: string }[] = []
  let hasPdf = false
  let useFilesApi = false

  for (const doc of docs) {
    const ext = doc.file_name.split('.').pop()?.toLowerCase() ?? ''
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
    const isPdf = ext === 'pdf'

    if (!isImage && !isPdf) {
      failed.push({ name: doc.file_name, reason: 'format non supporté' })
      continue
    }

    if (isPdf && doc.anthropic_file_id) {
      parts.push({ type: 'document', source: { type: 'file', file_id: doc.anthropic_file_id } })
      hasPdf = true
      useFilesApi = true
      names.push(doc.file_name)
      continue
    }

    if (isPdf && doc.file_size && doc.file_size > MAX_PDF_SIZE) {
      failed.push({ name: doc.file_name, reason: `trop volumineux (${(doc.file_size / 1024 / 1024).toFixed(1)} Mo)` })
      continue
    }

    const { data: signedData, error: signErr } = await admin.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600)

    if (signErr || !signedData?.signedUrl) {
      failed.push({ name: doc.file_name, reason: 'erreur URL signée' })
      continue
    }

    if (isPdf) {
      parts.push({ type: 'document', source: { type: 'url', url: signedData.signedUrl } })
      hasPdf = true
    } else {
      parts.push({
        type: 'image',
        source: { type: 'url', url: signedData.signedUrl, media_type: IMAGE_MEDIA_TYPES[ext] ?? 'image/jpeg' },
      })
    }
    names.push(doc.file_name)
  }

  return { parts, names, failed, hasPdf, useFilesApi }
}

/**
 * Try to analyze a list of documents in one Claude call.
 * Returns success or failure with reason.
 */
async function analyzeBatch(
  admin: SupabaseAdmin,
  docs: DocEntry[],
  anthropicKey: string,
  clientContext: string,
  questionsText: string,
  batchLabel: string,
  logCtx: { mission_id: string; organization_id: string | null; user_id: string | null },
): Promise<BatchResult> {
  const { parts, names, failed, hasPdf, useFilesApi } = await prepareDocs(admin, docs)

  if (parts.length === 0) {
    return { answers: [], analyzed: [], failed }
  }

  const docsListed = names.map((n) => `[${n}]`).join('; ')
  const prompt = `Tu es un auditeur SI senior rigoureux. Tu analyses UNIQUEMENT les documents fournis en pièces jointes pour pré-remplir un questionnaire de prise de connaissance.

${clientContext ? `CONTEXTE CLIENT: ${clientContext}\n` : ''}
DOCUMENTS DE CE LOT (${batchLabel}): ${docsListed}

QUESTIONS DU QUESTIONNAIRE:
${questionsText}

RÈGLES STRICTES D'ÉVALUATION DES PREUVES:

1. PREUVE DIRECTE (confiance 75-95%) : Le document joint traite directement du sujet.
2. DÉCLARATION SANS PREUVE (confiance 25-40%) : Mention sans document joint.
3. AUCUNE INFORMATION (ne pas répondre) : Aucun document ne mentionne le sujet.

Ne réponds qu'aux questions où tu trouves une information dans CES documents.

Génère un JSON avec un tableau "answers" contenant pour chaque question répondue :
- "questionCode": code de la question
- "questionLabel": libellé de la question
- "answer": réponse précise (2-4 phrases)
- "confidence": 0-100 (75-95 preuve directe, 25-40 déclaration)
- "sourceDoc": nom du document source ou null

JSON uniquement, en français.`

  parts.push({ type: 'text', text: prompt })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01',
  }
  // 1M context flag included — silently ignored if API tier doesn't support it
  const betaFlags: string[] = ['context-1m-2025-08-07']
  if (hasPdf) betaFlags.push('pdfs-2024-09-25')
  if (useFilesApi) betaFlags.push('files-api-2025-04-14')
  headers['anthropic-beta'] = betaFlags.join(',')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS)
  const startedAt = Date.now()
  const MODEL = 'claude-sonnet-4-20250514'

  let claudeRes: Response
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: parts }],
      }),
    })
  } catch (err) {
    clearTimeout(timeout)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error(`[smart-questionnaire] ${batchLabel} ${isAbort ? 'timeout' : 'fetch error'}:`, err)
    void logAiCall({ admin, function_name: 'smart-questionnaire', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: isAbort ? 'timeout' : 'fetch error', duration_ms: Date.now() - startedAt, mission_id: logCtx.mission_id, organization_id: logCtx.organization_id, user_id: logCtx.user_id })
    return { answers: [], analyzed: [], failed: [...failed, ...names.map((n) => ({ name: n, reason: isAbort ? 'timeout IA' : 'erreur réseau IA' }))] }
  }
  clearTimeout(timeout)

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    console.error(`[smart-questionnaire] ${batchLabel} Claude ${claudeRes.status}:`, errText.slice(0, 800))

    let reason = `Claude ${claudeRes.status}`
    try {
      const errJson = JSON.parse(errText)
      const msg = errJson?.error?.message ?? ''
      if (msg.toLowerCase().includes('page')) reason = 'PDF > 100 pages'
      else if (msg.toLowerCase().includes('token')) reason = 'trop volumineux pour le contexte IA'
      else if (msg.toLowerCase().includes('size')) reason = 'document trop volumineux'
      else if (msg) reason = `IA: ${msg.slice(0, 80)}`
    } catch { /* keep default */ }

    void logAiCall({ admin, function_name: 'smart-questionnaire', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}: ${reason}`, duration_ms: Date.now() - startedAt, mission_id: logCtx.mission_id, organization_id: logCtx.organization_id, user_id: logCtx.user_id })
    return { answers: [], analyzed: [], failed: [...failed, ...names.map((n) => ({ name: n, reason }))] }
  }

  const claudeData = await claudeRes.json()
  const rawText = claudeData.content?.[0]?.text ?? ''
  const clean = rawText.replace(/```json|```/g, '').trim()
  void logAiCall({ admin, function_name: 'smart-questionnaire', model: MODEL, input_tokens: claudeData.usage?.input_tokens ?? null, output_tokens: claudeData.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, mission_id: logCtx.mission_id, organization_id: logCtx.organization_id, user_id: logCtx.user_id })

  let parsed: { answers?: AIAnswer[] } = {}
  try {
    parsed = JSON.parse(clean)
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) {
      try { parsed = JSON.parse(match[0]) } catch { /* parsed stays empty */ }
    }
  }

  return { answers: parsed.answers ?? [], analyzed: names, failed }
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
        clientContext = `Client: ${cc.client_name}, Secteur: ${cc.client_sector ?? '?'}, Taille: ${cc.effectifs ?? '?'}, IT: ${(cc.it_systems ?? []).join(', ')}, Réglementations: ${regs || 'aucune'}, Référentiel: ${mission.framework?.name ?? '?'}`
      }
    }

    // ── 2. Récupérer les documents ─────────────────────────────────
    const totalCap = BATCH_SIZE * MAX_BATCHES
    const { data: allDocs } = await admin.from('documents')
      .select('file_name, file_path, mime_type, file_size, anthropic_file_id')
      .eq('mission_id', mission_id)
      .order('created_at', { ascending: false })
      .limit(totalCap + 5)

    const docList = (allDocs ?? []) as DocEntry[]
    const docsToProcess = docList.slice(0, totalCap)
    const docsSkipped = docList.length > totalCap ? docList.slice(totalCap).map((d) => d.file_name) : []

    // Split into batches
    const batches: DocEntry[][] = []
    for (let i = 0; i < docsToProcess.length; i += BATCH_SIZE) {
      batches.push(docsToProcess.slice(i, i + BATCH_SIZE))
    }

    if (batches.length === 0) {
      return new Response(JSON.stringify({ answers: [], docs_analyzed: 0, docs_total: 0, docs_skipped: [], docs_failed: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 2bis. Résolution du contexte pour ai_calls_log
    const { data: callerProfile } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', caller.id)
      .maybeSingle()
    const logCtx = {
      mission_id,
      organization_id: (mission as { cabinet_id?: string } | null)?.cabinet_id ?? null,
      user_id: (callerProfile as { id?: string } | null)?.id ?? null,
    }

    // ── 3. Process batches with single-doc fallback on failure ─────
    const mergedAnswers = new Map<string, AIAnswer>()
    const analyzedDocNames: string[] = []
    const failedDocs: { name: string; reason: string }[] = []
    const questionsText = questions.map((q) => `- ${q.code}: ${q.label}${q.description ? ` (${q.description})` : ''}`).join('\n')

    const mergeAnswers = (answers: AIAnswer[]): void => {
      for (const a of answers) {
        const existing = mergedAnswers.get(a.questionCode)
        if (!existing || a.confidence > existing.confidence) {
          mergedAnswers.set(a.questionCode, a)
        }
      }
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      const batchLabel = `${batchIdx + 1}/${batches.length}`

      // Try the full batch first
      const batchResult = await analyzeBatch(admin, batch, anthropicKey, clientContext, questionsText, batchLabel, logCtx)

      if (batchResult.answers.length > 0 || batchResult.failed.length === 0) {
        // Success or no failures
        mergeAnswers(batchResult.answers)
        analyzedDocNames.push(...batchResult.analyzed)
        failedDocs.push(...batchResult.failed)
        console.log(`[smart-questionnaire] Batch ${batchLabel}: ${batchResult.answers.length} answers, ${batchResult.analyzed.length} docs analyzed`)
        continue
      }

      // Batch failed entirely. If batch has > 1 doc, retry each individually.
      if (batch.length > 1) {
        console.log(`[smart-questionnaire] Batch ${batchLabel} failed, retrying each doc individually`)
        for (let i = 0; i < batch.length; i++) {
          const singleLabel = `${batchLabel} retry ${i + 1}/${batch.length}`
          const singleResult = await analyzeBatch(admin, [batch[i]], anthropicKey, clientContext, questionsText, singleLabel, logCtx)
          mergeAnswers(singleResult.answers)
          analyzedDocNames.push(...singleResult.analyzed)
          failedDocs.push(...singleResult.failed)
        }
      } else {
        // Already a singleton — just record the failure
        failedDocs.push(...batchResult.failed)
      }
    }

    const answers = [...mergedAnswers.values()].map((a) => ({ ...a, validated: false }))

    console.log(`[smart-questionnaire] Total: ${analyzedDocNames.length}/${docList.length} docs analyzed, ${answers.length} answers, ${failedDocs.length} failed`)

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
