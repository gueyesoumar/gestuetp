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
 * Modèle : claude-sonnet-4-20250514 (Haiku 4.5 trop laxiste sur la
 * détection des signatures réelles vs blocs vides et sur le versionning).
 * Sonnet est exigé pour la qualité — Pass 1 ne tourne qu'une fois par doc
 * puis le résultat est mis en cache permanent dans documents.ai_metadata.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_BETA = 'files-api-2025-04-14'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2500

const EXTRACT_TOOL = {
  name: 'save_metadata',
  description: 'Stocke les métadonnées extraites du document analysé. Chaque champ doit être étayé par une preuve textuelle quand applicable.',
  input_schema: {
    type: 'object',
    properties: {
      version: {
        type: ['string', 'null'],
        description: 'Numéro/libellé de version visible dans le document (ex: "v1.2", "Rev. 3", "Édition 2025"). null si absent. NE PAS confondre avec la date de dernière révision ou la date de génération PDF.',
      },
      version_evidence: {
        type: ['object', 'null'],
        description: 'Si version non null : où elle a été trouvée (en-tête, page de garde, footer, tableau de versions) + citation textuelle exacte. null si version=null.',
        properties: {
          location: { type: 'string', description: 'Ex: "page de garde", "en-tête page 1", "tableau de versions p.2".' },
          quote: { type: 'string', description: 'Citation textuelle exacte (max 100 chars).' },
        },
        required: ['location', 'quote'],
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
            signed: { type: 'boolean', description: 'true UNIQUEMENT si tu vois un paraphe manuscrit, un cachet, un scan de signature, ou une mention électronique vérifiable type "signé électroniquement par X le YYYY-MM-DD". false dans tous les autres cas (bloc vide, simple "Signé : _____", mention "signé" sans visuel).' },
            date: { type: ['string', 'null'], description: 'Date de signature au format YYYY-MM-DD si visible.' },
            evidence: {
              type: ['object', 'null'],
              description: 'Si signed=true : preuve visuelle. null si signed=false.',
              properties: {
                page: { type: ['number', 'null'], description: 'Numéro de page où la signature a été observée.' },
                quote: { type: 'string', description: 'Description exacte de la preuve : "paraphe manuscrit visible", "cachet rond DG", "Signé électroniquement par J. Dupont le 2025-03-10". Max 120 chars.' },
              },
              required: ['page', 'quote'],
            },
          },
          required: ['role', 'name', 'signed', 'date', 'evidence'],
        },
      },
      formality_score: {
        type: 'number',
        description: 'Score 0-100 strictement basé sur la présence DE PREUVES VISUELLES. Barème : 90-100 = en-tête officiel + version + dates + ≥1 signature signed=true ; 60-80 = 2 ou 3 de ces critères ; 30-50 = en-tête présent mais ni signature visuelle ni version ; <30 = note libre, brouillon, sans en-tête. Une simple mention "ce document est signé" sans signature visuelle NE compte PAS.',
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
        description: 'Synthèse en 2-3 phrases : nature du document, contenu principal, niveau de formalité OBSERVÉ (non déclaratif).',
      },
    },
    required: ['version', 'version_evidence', 'last_revision_date', 'signatures', 'formality_score', 'scope_declared', 'key_topics', 'page_count', 'synthesis'],
  },
} as const

const EXTRACT_PROMPT = `Tu es un auditeur SI senior. Analyse le document fourni et extrais ses métadonnées factuelles avec rigueur.

RÈGLES STRICTES — la qualité de cette extraction est critique :

1. SIGNATURES : signed=true UNIQUEMENT si tu observes une preuve visuelle :
   - paraphe manuscrit (trait, gribouillis distinctif)
   - cachet/tampon (rond, rectangulaire, signé)
   - scan/image de signature collée
   - mention électronique vérifiable du type "Signé électroniquement par X le YYYY-MM-DD"

   Comptent comme signed=false :
   - bloc "Signature : ___" vide
   - mention "Le présent document est signé" SANS preuve visuelle
   - "Pour le DG" sans paraphe visible
   - en-tête nominatif sans signature

2. VERSION : ne confonds jamais avec la date de génération PDF ou la date de dernière révision. La version est un identifiant explicite (ex: "v1.2", "Rev.3", "Édition 2025"). Si tu trouves la version, fournis version_evidence (où + citation).

3. FORMALITY_SCORE : strictement basé sur les preuves observées, jamais sur les déclarations.

4. N'INVENTE JAMAIS : si une donnée n'est pas visible, mets null. Mieux vaut un null qu'une hallucination.

Réponds UNIQUEMENT en appelant l'outil save_metadata.`

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
