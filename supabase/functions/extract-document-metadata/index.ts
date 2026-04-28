import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

/**
 * Edge Function : extract-document-metadata (Passe 1 du pipeline IA)
 *
 * Pour chaque document uploadé sur Anthropic Files API, extrait des
 * métadonnées structurées (version, signatures, formality_score, scope,
 * key_topics, synthesis) et les stocke dans documents.ai_metadata.
 *
 * Cette passe est appelée en fire-and-forget après ai-documents/upload.
 * Elle alimente la Passe 2 (synthèse multi-doc) qui pourra exploiter
 * ces métadonnées sans relire les fichiers.
 *
 * Court-circuit :
 *   - Cabinet a coupé l'IA (organizations.ai_analysis_enabled=false)
 *   - Document déjà extrait (ai_extracted_at non NULL) — idempotent
 *   - Pas de anthropic_file_id → erreur persistée
 *
 * Modèle : claude-haiku-4-5-20251001 (extraction structurée, ~3x moins cher
 * que Sonnet, qualité suffisante pour métadonnées factuelles).
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_BETA = 'files-api-2025-04-14'
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1500

const EXTRACT_TOOL = {
  name: 'save_metadata',
  description: 'Stocke les métadonnées extraites du document analysé.',
  input_schema: {
    type: 'object',
    properties: {
      version: {
        type: ['string', 'null'],
        description: 'Numéro/libellé de version visible dans le document (ex: "v1.2", "Rev. 3", "Édition 2025"). null si absent.',
      },
      last_revision_date: {
        type: ['string', 'null'],
        description: 'Date de dernière révision si extractible, au format YYYY-MM-DD. null sinon.',
      },
      signatures: {
        type: 'array',
        description: 'Toutes les signatures détectées : bloc signataire, paraphe, cachet, mention "signé par". Inclure les emplacements vides avec signed=false.',
        items: {
          type: 'object',
          properties: {
            role: { type: ['string', 'null'], description: 'Fonction du signataire (ex: "RSSI", "DG", "DAF").' },
            name: { type: ['string', 'null'], description: 'Nom complet si visible.' },
            signed: { type: 'boolean', description: 'true si signature apposée (paraphe, cachet, scan visible). false si emplacement présent mais vide.' },
            date: { type: ['string', 'null'], description: 'Date de signature au format YYYY-MM-DD si visible.' },
          },
          required: ['role', 'name', 'signed', 'date'],
        },
      },
      formality_score: {
        type: 'number',
        description: 'Score 0-100 de formalité du document. 100 = entièrement formel (signé, daté, versionné, en-tête officiel). 50 = partiellement formel (ex: signé mais non daté). 0 = note libre, brouillon.',
        minimum: 0,
        maximum: 100,
      },
      scope_declared: {
        type: ['string', 'null'],
        description: 'Périmètre déclaré du document (ex: "filiale Sénégal uniquement", "tous les SI groupe", "site Dakar"). null si non précisé.',
      },
      key_topics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Sujets de conformité principaux abordés (5 max), en français court (ex: "gestion des accès", "PCA", "classification des données").',
      },
      page_count: {
        type: ['number', 'null'],
        description: 'Nombre de pages estimé. null si non applicable (image, CSV).',
      },
      synthesis: {
        type: 'string',
        description: 'Synthèse en 2-3 phrases : nature du document, contenu principal, niveau de formalité.',
      },
    },
    required: ['version', 'last_revision_date', 'signatures', 'formality_score', 'scope_declared', 'key_topics', 'page_count', 'synthesis'],
  },
} as const

const EXTRACT_PROMPT = `Tu es un assistant de conformité. Analyse le document fourni et extrais ses métadonnées factuelles.

Sois rigoureux :
- Une signature est "apposée" uniquement si tu vois un paraphe, cachet, scan, ou la mention explicite "signé". Un bloc "Nom : ___ Signature : ___" vide ne compte PAS comme signé.
- Si le document est une note libre non datée non signée, formality_score doit être très bas (<30).
- N'invente jamais : si une donnée n'est pas visible, mets null.
- Réponds UNIQUEMENT en appelant l'outil save_metadata avec les valeurs extraites.`

interface DocRow {
  id: string
  mission_id: string
  file_name: string
  anthropic_file_id: string | null
  anthropic_file_kind: 'document' | 'image' | null
  ai_extracted_at: string | null
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json() as { document_id?: string }
    const documentId = body.document_id
    if (!documentId) return jsonResponse({ error: 'document_id requis' }, 400)

    // 1. Lookup document
    const { data: docData, error: docErr } = await admin
      .from('documents')
      .select('id, mission_id, file_name, anthropic_file_id, anthropic_file_kind, ai_extracted_at')
      .eq('id', documentId)
      .single()

    if (docErr || !docData) {
      return jsonResponse({ error: 'Document introuvable' }, 404)
    }
    const doc = docData as DocRow

    // Idempotent : déjà extrait
    if (doc.ai_extracted_at) {
      return jsonResponse({ skipped: 'already_extracted' })
    }

    if (!doc.anthropic_file_id) {
      await persistError(admin, doc.id, 'no_file_id')
      return jsonResponse({ error: 'Document sans anthropic_file_id' }, 400)
    }

    // 2. Kill switch cabinet
    const { data: missionData } = await admin
      .from('missions')
      .select('cabinet_id')
      .eq('id', doc.mission_id)
      .maybeSingle()
    const cabinetId = (missionData as { cabinet_id?: string } | null)?.cabinet_id ?? null

    if (cabinetId) {
      const { data: orgData } = await admin
        .from('organizations')
        .select('ai_analysis_enabled')
        .eq('id', cabinetId)
        .maybeSingle()
      const enabled = (orgData as { ai_analysis_enabled?: boolean } | null)?.ai_analysis_enabled ?? true
      if (!enabled) {
        return jsonResponse({ skipped: 'cabinet_ai_disabled' })
      }
    }

    // 3. Build content block
    const kind = doc.anthropic_file_kind ?? 'document'
    // deno-lint-ignore no-explicit-any
    const content: any[] = [
      { type: kind, source: { type: 'file', file_id: doc.anthropic_file_id } },
      { type: 'text', text: EXTRACT_PROMPT },
    ]

    // 4. Call Claude with forced tool_use
    const startedAt = Date.now()
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 120_000)

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
        signal: ctrl.signal,
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          tools: [EXTRACT_TOOL],
          tool_choice: { type: 'tool', name: 'save_metadata' },
          messages: [{ role: 'user', content }],
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error(`[extract-document-metadata] Claude ${claudeRes.status}:`, errText.slice(0, 300))
      const errCode = claudeRes.status === 404 ? 'file_not_found' : `anthropic_${claudeRes.status}`
      await persistError(admin, doc.id, errCode)
      void logAiCall({
        admin, function_name: 'extract-document-metadata', model: MODEL,
        input_tokens: null, output_tokens: null, success: false,
        error_message: `${claudeRes.status}: ${errText.slice(0, 200)}`,
        duration_ms: Date.now() - startedAt,
        mission_id: doc.mission_id, organization_id: cabinetId, user_id: null,
      })
      return jsonResponse({ error: 'Extraction impossible' }, 502)
    }

    const data = await claudeRes.json()
    const usage = data.usage ?? {}

    // 5. Find tool_use block
    // deno-lint-ignore no-explicit-any
    const toolUse = (data.content ?? []).find((b: any) => b.type === 'tool_use' && b.name === 'save_metadata')
    if (!toolUse?.input) {
      console.error('[extract-document-metadata] No tool_use block in response')
      await persistError(admin, doc.id, 'no_tool_use')
      void logAiCall({
        admin, function_name: 'extract-document-metadata', model: data.model ?? MODEL,
        input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null,
        success: false, error_message: 'no_tool_use',
        duration_ms: Date.now() - startedAt,
        mission_id: doc.mission_id, organization_id: cabinetId, user_id: null,
      })
      return jsonResponse({ error: 'Réponse IA invalide' }, 502)
    }

    // 6. Persist metadata
    // deno-lint-ignore no-explicit-any
    const { error: updErr } = await (admin.from('documents') as any)
      .update({
        ai_metadata: toolUse.input,
        ai_extracted_at: new Date().toISOString(),
        ai_extract_error: null,
      })
      .eq('id', doc.id)

    if (updErr) {
      console.error('[extract-document-metadata] DB update failed:', updErr.message)
      return jsonResponse({ error: 'Persistance impossible' }, 500)
    }

    // 7. Invalider le cache mission (la prochaine synthèse devra recompiler)
    // deno-lint-ignore no-explicit-any
    await (admin.from('missions') as any)
      .update({ ai_synthesis_cache: null, ai_synthesis_at: null })
      .eq('id', doc.mission_id)

    void logAiCall({
      admin, function_name: 'extract-document-metadata', model: data.model ?? MODEL,
      input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null,
      success: true, duration_ms: Date.now() - startedAt,
      mission_id: doc.mission_id, organization_id: cabinetId, user_id: null,
    })

    return jsonResponse({ success: true, document_id: doc.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[extract-document-metadata] Error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

async function persistError(
  // deno-lint-ignore no-explicit-any
  admin: any,
  documentId: string,
  code: string,
): Promise<void> {
  const { error } = await admin.from('documents')
    .update({ ai_extract_error: code })
    .eq('id', documentId)
  if (error) console.warn('[extract-document-metadata] persistError failed:', error.message)
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
