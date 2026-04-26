import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

/**
 * Edge Function: ai-documents
 *
 * Manages document lifecycle with Anthropic Files API.
 * Actions: upload, delete, analyze
 *
 * The Anthropic API key stays server-side — never exposed to the frontend.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_BETA = 'files-api-2025-04-14,context-1m-2025-08-07'
const SUPPORTED_TYPES = ['application/pdf', 'text/plain', 'text/csv', 'text/html']
const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32 MB (Anthropic limit)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return jsonResponse({ error: 'Cl\u00e9 API Anthropic non configur\u00e9e' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const action = body.action as string

    switch (action) {
      case 'upload':
        return await handleUpload(admin, anthropicKey, body)
      case 'delete':
        return await handleDelete(admin, anthropicKey, body)
      case 'analyze':
        return await handleAnalyze(admin, anthropicKey, body)
      default:
        return jsonResponse({ error: `Action inconnue: ${action}` }, 400)
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[ai-documents] Error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

// ── UPLOAD ──────────────────────────────────────────────────────────────────
// Downloads file from Supabase Storage → uploads to Anthropic Files API
// Stores the file_id back in the documents table

async function handleUpload(
  admin: ReturnType<typeof createClient>,
  anthropicKey: string,
  body: { document_id: string }
): Promise<Response> {
  const { document_id } = body
  if (!document_id) return jsonResponse({ error: 'document_id requis' }, 400)

  // 1. Get document metadata from Supabase
  const { data: doc, error: docErr } = await admin
    .from('documents')
    .select('id, file_name, file_path, file_size, mime_type, anthropic_file_id')
    .eq('id', document_id)
    .single()

  if (docErr || !doc) return jsonResponse({ error: 'Document introuvable' }, 404)

  // Already uploaded?
  if (doc.anthropic_file_id) {
    return jsonResponse({ file_id: doc.anthropic_file_id, already_uploaded: true })
  }

  // Check size
  if (doc.file_size && doc.file_size > MAX_FILE_SIZE) {
    return jsonResponse({ error: `Fichier trop volumineux (${(doc.file_size / 1024 / 1024).toFixed(1)}Mo). Maximum: 32Mo.` }, 400)
  }

  // 2. Download from Supabase Storage
  const { data: fileData, error: dlErr } = await admin.storage
    .from('documents')
    .download(doc.file_path)

  if (dlErr || !fileData) {
    console.error('[ai-documents] Download error:', dlErr?.message)
    return jsonResponse({ error: 'Impossible de t\u00e9l\u00e9charger le fichier depuis le stockage' }, 500)
  }

  // 3. Upload to Anthropic Files API via multipart form
  const formData = new FormData()
  formData.append('file', fileData, doc.file_name)

  const uploadRes = await fetch(`${ANTHROPIC_API}/files`, {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': ANTHROPIC_BETA,
    },
    body: formData,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    console.error('[ai-documents] Anthropic upload error:', uploadRes.status, errText)

    let userMessage = 'Erreur lors de l\'upload vers le service d\'analyse'
    if (errText.includes('file_too_large')) userMessage = 'Fichier trop volumineux pour l\'analyse IA'
    if (errText.includes('unsupported')) userMessage = 'Type de fichier non support\u00e9 pour l\'analyse IA'

    return jsonResponse({ error: userMessage }, 502)
  }

  const uploadData = await uploadRes.json()
  const fileId = uploadData.id as string

  console.log(`[ai-documents] Uploaded ${doc.file_name} → ${fileId}`)

  // 4. Store file_id in Supabase
  const { error: updateErr } = await admin
    .from('documents')
    .update({
      anthropic_file_id: fileId,
      anthropic_file_uploaded_at: new Date().toISOString(),
    })
    .eq('id', document_id)

  if (updateErr) {
    console.error('[ai-documents] DB update error:', updateErr.message)
    // Non-blocking — the upload succeeded, we just failed to save the ID
  }

  return jsonResponse({ file_id: fileId, file_name: doc.file_name })
}

// ── DELETE ──────────────────────────────────────────────────────────────────
// Deletes a file from Anthropic and clears the file_id in Supabase

async function handleDelete(
  admin: ReturnType<typeof createClient>,
  anthropicKey: string,
  body: { document_id?: string; file_id?: string }
): Promise<Response> {
  let fileId = body.file_id

  // If document_id provided, look up the file_id
  if (!fileId && body.document_id) {
    const { data: doc } = await admin
      .from('documents')
      .select('anthropic_file_id')
      .eq('id', body.document_id)
      .single()

    fileId = doc?.anthropic_file_id
  }

  if (!fileId) return jsonResponse({ error: 'file_id ou document_id requis' }, 400)

  // Delete from Anthropic
  const delRes = await fetch(`${ANTHROPIC_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': ANTHROPIC_BETA,
    },
  })

  if (!delRes.ok && delRes.status !== 404) {
    const errText = await delRes.text()
    console.error('[ai-documents] Anthropic delete error:', delRes.status, errText)
    return jsonResponse({ error: 'Erreur lors de la suppression' }, 502)
  }

  // Clear from Supabase
  if (body.document_id) {
    await admin
      .from('documents')
      .update({ anthropic_file_id: null, anthropic_file_uploaded_at: null })
      .eq('id', body.document_id)
  }

  console.log(`[ai-documents] Deleted ${fileId}`)
  return jsonResponse({ success: true })
}

// ── ANALYZE ─────────────────────────────────────────────────────────────────
// Uses file_id(s) to analyze documents with Claude — zero memory for files

async function handleAnalyze(
  admin: ReturnType<typeof createClient>,
  anthropicKey: string,
  body: {
    file_ids: string[]
    prompt: string
    model?: string
    max_tokens?: number
    mission_id?: string
    control_code?: string
    control_name?: string
    domain?: string
  }
): Promise<Response> {
  const { file_ids, prompt, model, max_tokens, mission_id, control_code, control_name, domain } = body

  if (!file_ids?.length || !prompt) {
    return jsonResponse({ error: 'file_ids et prompt requis' }, 400)
  }

  // Build content blocks: files first, then text
  // deno-lint-ignore no-explicit-any
  const content: any[] = []

  for (const fid of file_ids.slice(0, 5)) {
    content.push({
      type: 'document',
      source: { type: 'file', file_id: fid },
    })
  }

  // Enrich prompt with mission context if available
  let enrichedPrompt = prompt
  if (mission_id) {
    const ctx = await buildMissionContext(admin, mission_id, control_code, control_name, domain)
    if (ctx) enrichedPrompt = `${ctx}\n\n${prompt}`
  }

  content.push({ type: 'text', text: enrichedPrompt })

  console.log(`[ai-documents] Analyzing ${file_ids.length} file(s) with ${model ?? 'claude-sonnet-4-20250514'}`)

  // Call Claude
  const claudeController = new AbortController()
  const claudeTimeout = setTimeout(() => claudeController.abort(), 180_000) // 3 min for large docs
  const startedAt = Date.now()
  const usedModel = model ?? 'claude-sonnet-4-20250514'

  // Cabinet pour log : depuis mission_id si pr\u00e9sent
  let cabinetIdForLog: string | null = null
  if (mission_id) {
    const { data: m } = await admin.from('missions').select('cabinet_id').eq('id', mission_id).maybeSingle()
    cabinetIdForLog = (m as { cabinet_id?: string } | null)?.cabinet_id ?? null
  }

  let claudeRes: Response
  try {
    claudeRes = await fetch(`${ANTHROPIC_API}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': ANTHROPIC_BETA,
      },
      signal: claudeController.signal,
      body: JSON.stringify({
        model: usedModel,
        max_tokens: max_tokens ?? 4096,
        messages: [{ role: 'user', content }],
      }),
    })
  } finally {
    clearTimeout(claudeTimeout)
  }

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    console.error('[ai-documents] Claude error:', claudeRes.status, errText.slice(0, 500))

    let userMessage = `Erreur d'analyse (${claudeRes.status})`
    if (errText.includes('file_not_found')) userMessage = 'Un des fichiers a expir\u00e9. Veuillez le re-uploader.'
    if (errText.includes('too_large')) userMessage = 'Les documents sont trop volumineux pour une seule analyse.'

    void logAiCall({ admin, function_name: 'ai-documents', model: usedModel, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}: ${userMessage}`, duration_ms: Date.now() - startedAt, mission_id: mission_id ?? null, organization_id: cabinetIdForLog, user_id: null })
    return jsonResponse({ error: userMessage }, 502)
  }

  const data = await claudeRes.json()
  const text = data.content?.[0]?.text ?? ''
  const usage = data.usage ?? {}

  void logAiCall({ admin, function_name: 'ai-documents', model: data.model ?? usedModel, input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, mission_id: mission_id ?? null, organization_id: cabinetIdForLog, user_id: null })

  return jsonResponse({
    text,
    model: data.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    files_analyzed: file_ids.length,
  })
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

async function buildMissionContext(
  admin: ReturnType<typeof createClient>,
  missionId: string,
  controlCode?: string,
  controlName?: string,
  domain?: string,
): Promise<string | null> {
  const { data: m } = await admin
    .from('missions')
    .select('client_id, framework:frameworks(name)')
    .eq('id', missionId)
    .single()

  if (!m) return null

  const { data: ccs } = await admin
    .from('cabinet_clients')
    .select('client_name, client_sector, effectifs')
    .eq('client_org_id', m.client_id)
    .limit(1)

  const cc = ccs?.[0]
  const parts: string[] = []

  if (cc) parts.push(`Client: ${cc.client_name}, Secteur: ${cc.client_sector ?? '?'}, Taille: ${cc.effectifs ?? '?'}`)
  const fw = m.framework as { name: string } | null
  if (fw) parts.push(`R\u00e9f\u00e9rentiel: ${fw.name}`)
  if (controlCode) parts.push(`Contr\u00f4le: ${controlCode}${controlName ? ` \u2014 ${controlName}` : ''}`)
  if (domain) parts.push(`Domaine: ${domain}`)

  return parts.length > 0 ? `CONTEXTE MISSION: ${parts.join(', ')}` : null
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
