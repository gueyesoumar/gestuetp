import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'
// @deno-types="npm:@types/mammoth"
import mammoth from 'npm:mammoth@1.6.0'
import * as XLSX from 'npm:xlsx@0.18.5'

/**
 * Edge Function: ai-documents
 *
 * Manages document lifecycle with Anthropic Files API.
 * Actions: upload, delete, analyze
 *
 * Format support (côté serveur, transparent pour le client) :
 *   - PDF / TXT / CSV / HTML / HTM  → upload natif (kind=document)
 *   - DOCX / DOC                    → mammoth → texte plat → upload .txt (kind=document)
 *   - XLSX / XLS                    → SheetJS → CSV multi-feuilles → upload .csv (kind=document)
 *   - PNG / JPG / JPEG / WEBP       → upload natif (kind=image)
 *
 * La clé Anthropic reste serveur — jamais exposée au frontend.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_BETA = 'files-api-2025-04-14,context-1m-2025-08-07'
const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32 MB (Anthropic Files API limit)

type FileKind = 'document' | 'image'

interface PreparedAsset {
  blob: Blob
  fileName: string
  kind: FileKind
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return jsonResponse({ error: 'Clé API Anthropic non configurée' }, 500)
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
// Downloads file from Supabase Storage → (optional conversion) → uploads
// to Anthropic Files API. Stores file_id + kind back in the documents table.

async function handleUpload(
  admin: ReturnType<typeof createClient>,
  anthropicKey: string,
  body: { document_id: string }
): Promise<Response> {
  const { document_id } = body
  if (!document_id) return jsonResponse({ error: 'document_id requis' }, 400)

  const { data: doc, error: docErr } = await admin
    .from('documents')
    .select('id, file_name, file_path, file_size, mime_type, anthropic_file_id')
    .eq('id', document_id)
    .single()

  if (docErr || !doc) return jsonResponse({ error: 'Document introuvable' }, 404)

  if (doc.anthropic_file_id) {
    return jsonResponse({ file_id: doc.anthropic_file_id, already_uploaded: true })
  }

  if (doc.file_size && doc.file_size > MAX_FILE_SIZE) {
    return jsonResponse({ error: `Fichier trop volumineux (${(doc.file_size / 1024 / 1024).toFixed(1)}Mo). Maximum: 32Mo.` }, 400)
  }

  const { data: fileData, error: dlErr } = await admin.storage
    .from('documents')
    .download(doc.file_path)

  if (dlErr || !fileData) {
    console.error('[ai-documents] Download error:', dlErr?.message)
    return jsonResponse({ error: 'Impossible de télécharger le fichier depuis le stockage' }, 500)
  }

  // Détection format + conversion serveur si nécessaire
  let prepared: PreparedAsset
  try {
    prepared = await prepareAsset(fileData, doc.file_name)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Conversion impossible'
    console.error(`[ai-documents] Convert error for ${doc.file_name}:`, msg)
    await persistExtractError(admin, document_id, `convert_error: ${msg.slice(0, 200)}`)
    return jsonResponse({ error: `Conversion du fichier impossible : ${msg}` }, 400)
  }

  if (prepared.blob.size > MAX_FILE_SIZE) {
    const sizeMb = (prepared.blob.size / 1024 / 1024).toFixed(1)
    await persistExtractError(admin, document_id, `converted_too_large: ${sizeMb}Mo`)
    return jsonResponse({ error: `Fichier converti trop volumineux (${sizeMb}Mo). Maximum: 32Mo.` }, 400)
  }

  const formData = new FormData()
  formData.append('file', prepared.blob, prepared.fileName)

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
    if (errText.includes('unsupported')) userMessage = 'Type de fichier non supporté pour l\'analyse IA'

    await persistExtractError(admin, document_id, `anthropic_${uploadRes.status}`)
    return jsonResponse({ error: userMessage }, 502)
  }

  const uploadData = await uploadRes.json()
  const fileId = uploadData.id as string

  console.log(`[ai-documents] Uploaded ${doc.file_name} (kind=${prepared.kind}) → ${fileId}`)

  // deno-lint-ignore no-explicit-any
  const { error: updateErr } = await (admin.from('documents') as any)
    .update({
      anthropic_file_id: fileId,
      anthropic_file_uploaded_at: new Date().toISOString(),
      anthropic_file_kind: prepared.kind,
    })
    .eq('id', document_id)

  if (updateErr) {
    console.error('[ai-documents] DB update error:', updateErr.message)
  }

  return jsonResponse({ file_id: fileId, file_name: doc.file_name, kind: prepared.kind })
}

// ── DELETE ──────────────────────────────────────────────────────────────────

async function handleDelete(
  admin: ReturnType<typeof createClient>,
  anthropicKey: string,
  body: { document_id?: string; file_id?: string }
): Promise<Response> {
  let fileId = body.file_id

  if (!fileId && body.document_id) {
    const { data: doc } = await admin
      .from('documents')
      .select('anthropic_file_id')
      .eq('id', body.document_id)
      .single()

    fileId = doc?.anthropic_file_id
  }

  if (!fileId) return jsonResponse({ error: 'file_id ou document_id requis' }, 400)

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

  if (body.document_id) {
    // deno-lint-ignore no-explicit-any
    await (admin.from('documents') as any)
      .update({ anthropic_file_id: null, anthropic_file_uploaded_at: null, anthropic_file_kind: null })
      .eq('id', body.document_id)
  }

  console.log(`[ai-documents] Deleted ${fileId}`)
  return jsonResponse({ success: true })
}

// ── ANALYZE ─────────────────────────────────────────────────────────────────
// Builds content blocks per file_id : 'document' or 'image' selon le kind
// stocké en BDD lors du upload. Indispensable pour les images.

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

  const trimmedFileIds = file_ids.slice(0, 5)

  // Lookup kinds en un seul SELECT pour ne pas multiplier les RTT
  const { data: docsForKind } = await admin
    .from('documents')
    .select('anthropic_file_id, anthropic_file_kind')
    .in('anthropic_file_id', trimmedFileIds)

  const kindByFileId = new Map<string, FileKind>()
  for (const d of (docsForKind ?? []) as Array<{ anthropic_file_id: string; anthropic_file_kind: FileKind | null }>) {
    if (d.anthropic_file_id) kindByFileId.set(d.anthropic_file_id, d.anthropic_file_kind ?? 'document')
  }

  // deno-lint-ignore no-explicit-any
  const content: any[] = []

  for (const fid of trimmedFileIds) {
    const kind = kindByFileId.get(fid) ?? 'document'
    content.push({
      type: kind, // 'document' ou 'image'
      source: { type: 'file', file_id: fid },
    })
  }

  let enrichedPrompt = prompt
  if (mission_id) {
    const ctx = await buildMissionContext(admin, mission_id, control_code, control_name, domain)
    if (ctx) enrichedPrompt = `${ctx}\n\n${prompt}`
  }

  content.push({ type: 'text', text: enrichedPrompt })

  console.log(`[ai-documents] Analyzing ${trimmedFileIds.length} file(s) with ${model ?? 'claude-sonnet-4-20250514'}`)

  const claudeController = new AbortController()
  const claudeTimeout = setTimeout(() => claudeController.abort(), 180_000)
  const startedAt = Date.now()
  const usedModel = model ?? 'claude-sonnet-4-20250514'

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
    if (errText.includes('file_not_found')) userMessage = 'Un des fichiers a expiré. Veuillez le re-uploader.'
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
    files_analyzed: trimmedFileIds.length,
  })
}

// ── PREPARE ASSET ───────────────────────────────────────────────────────────
// Détermine le kind et applique la conversion serveur si nécessaire.
// Throws si le format est non géré.

async function prepareAsset(blob: Blob, fileName: string): Promise<PreparedAsset> {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase()

  // Natif Anthropic (document)
  if (['pdf', 'txt', 'csv', 'html', 'htm', 'md'].includes(ext)) {
    return { blob, fileName, kind: 'document' }
  }

  // Natif Anthropic (image)
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return { blob, fileName, kind: 'image' }
  }

  // DOCX / DOC → texte plat via mammoth
  if (ext === 'docx' || ext === 'doc') {
    const buffer = await blob.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = (result?.value ?? '').trim()
    if (!text) throw new Error('Document Word vide ou illisible')
    const newName = fileName.replace(/\.docx?$/i, '') + '.txt'
    return {
      blob: new Blob([text], { type: 'text/plain' }),
      fileName: newName,
      kind: 'document',
    }
  }

  // XLSX / XLS → CSV multi-feuilles
  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await blob.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    if (!wb.SheetNames.length) throw new Error('Classeur Excel vide')
    const parts: string[] = []
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      if (!sheet) continue
      const csv = XLSX.utils.sheet_to_csv(sheet)
      if (csv.trim()) {
        parts.push(`--- Feuille: ${sheetName} ---\n${csv}`)
      }
    }
    if (!parts.length) throw new Error('Classeur Excel sans données')
    const merged = parts.join('\n\n')
    const newName = fileName.replace(/\.xlsx?$/i, '') + '.csv'
    return {
      blob: new Blob([merged], { type: 'text/csv' }),
      fileName: newName,
      kind: 'document',
    }
  }

  throw new Error(`Format .${ext} non supporté`)
}

async function persistExtractError(
  admin: ReturnType<typeof createClient>,
  documentId: string,
  errorCode: string,
): Promise<void> {
  // deno-lint-ignore no-explicit-any
  const { error } = await (admin.from('documents') as any)
    .update({ ai_extract_error: errorCode })
    .eq('id', documentId)
  if (error) console.warn('[ai-documents] persistExtractError failed:', error.message)
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
  if (fw) parts.push(`Référentiel: ${fw.name}`)
  if (controlCode) parts.push(`Contrôle: ${controlCode}${controlName ? ` — ${controlName}` : ''}`)
  if (domain) parts.push(`Domaine: ${domain}`)

  return parts.length > 0 ? `CONTEXTE MISSION: ${parts.join(', ')}` : null
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
