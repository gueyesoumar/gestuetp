import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAiCall } from '../_shared/log-ai-call.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function : smart-questionnaire (Passe 2 du pipeline IA)
 *
 * Synthèse multi-document mission-wide. Consomme les ai_metadata produites
 * par la Passe 1 (extract-document-metadata) au lieu de re-feeder Claude
 * avec chaque fichier brut.
 *
 * Sortie par question :
 *   - answer (string)
 *   - evidence_type ('declared_only' | 'declared_with_doc' | 'declared_with_signed_doc')
 *   - confidence (0-100)
 *   - source_documents (string[])
 *
 * Cache : missions.ai_synthesis_cache + ai_synthesis_at (TTL 24h).
 *         Invalidé automatiquement par la Passe 1 sur tout nouvel upload.
 */

type SupabaseAdmin = ReturnType<typeof createClient>

interface QuestionInput {
  code: string
  label: string
  description: string | null
}

type EvidenceType = 'declared_only' | 'declared_with_doc' | 'declared_with_signed_doc'

interface AIAnswer {
  questionCode: string
  questionLabel: string
  answer: string
  confidence: number
  evidenceType: EvidenceType
  sourceDocs: string[]
}

interface SignatureEvidence {
  page: number | null
  quote: string
}

interface DocumentSignature {
  role: string | null
  name: string | null
  signed: boolean
  date: string | null
  evidence?: SignatureEvidence | null
}

interface VersionEvidence {
  location: string
  quote: string
}

interface DocumentAiMetadata {
  version: string | null
  version_evidence?: VersionEvidence | null
  last_revision_date: string | null
  signatures: DocumentSignature[]
  formality_score: number | null
  scope_declared: string | null
  key_topics: string[]
  page_count: number | null
  synthesis: string | null
}

interface DocRow {
  id: string
  file_name: string
  anthropic_file_id: string | null
  anthropic_file_kind: 'document' | 'image' | null
  ai_metadata: DocumentAiMetadata | null
  ai_extracted_at: string | null
  ai_extract_error: string | null
}

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4000
const CLAUDE_TIMEOUT_MS = 120_000
const CACHE_TTL_HOURS = 24
const FALLBACK_DOC_LIMIT = 8 // si aucun ai_metadata dispo, on attache jusqu'à 8 docs bruts
const BACKFILL_CONCURRENCY = 1 // sequential — extract-document-metadata fait déjà du retry sur 429,
                               // le séquentiel évite d'aggraver le rate limit Anthropic
const BACKFILL_LIMIT = 20 // au-delà on n'attend pas — l'utilisateur verra le résultat à la prochaine analyse

const SYNTHESIZE_TOOL = {
  name: 'propose_answers',
  description: 'Renvoie une réponse pré-remplie pour chaque question du questionnaire de prise de connaissance, en exploitant les métadonnées des documents fournis par le client.',
  input_schema: {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        description: 'Une entrée par question pour laquelle tu trouves au moins un élément dans le corpus. Ne pas inclure les questions sans aucune information.',
        items: {
          type: 'object',
          properties: {
            question_code: { type: 'string' },
            question_label: { type: 'string' },
            answer: { type: 'string', description: 'Réponse en 2-4 phrases, factuelle, en français.' },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Confiance globale 0-100. 90-95 si plusieurs docs concordants signés ; 70-85 si un doc signé ; 50-70 si un doc non signé ; 25-45 si simple déclaration sans doc.',
            },
            evidence_type: {
              type: 'string',
              enum: ['declared_only', 'declared_with_doc', 'declared_with_signed_doc'],
              description: "Qualité de la preuve. 'declared_with_signed_doc' EXIGE simultanément : un doc dédié au sujet + au moins une signature avec preuve visuelle (Signatures avec preuve non vide) + formalité observée >= 70. Sinon 'declared_with_doc' (doc dédié mais une condition manque) ou 'declared_only' (aucun doc dédié, pure mention textuelle). Une simple mention 'signé par X' sans preuve visuelle est PROSCRITE comme declared_with_signed_doc.",
            },
            source_documents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Noms exacts des documents (file_name) ayant servi de source. Vide si declared_only.',
            },
          },
          required: ['question_code', 'question_label', 'answer', 'confidence', 'evidence_type', 'source_documents'],
        },
      },
    },
    required: ['answers'],
  },
} as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return jsonResponse({ error: 'Clé API IA non configurée' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autorisé' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user: caller } } = await admin.auth.getUser(token)
    if (!caller) return jsonResponse({ error: 'Non autorisé' }, 401)

    const { mission_id, questions } = await req.json() as { mission_id: string; questions: QuestionInput[] }
    if (!mission_id || !questions?.length) {
      return jsonResponse({ error: 'mission_id et questions requis' }, 400)
    }

    // 1. Mission + cabinet + kill switch
    const { data: missionData } = await admin
      .from('missions')
      .select('name, client_id, cabinet_id, framework:frameworks(name), ai_synthesis_cache, ai_synthesis_at')
      .eq('id', mission_id)
      .single()

    const mission = missionData as {
      name: string
      client_id: string
      cabinet_id: string
      framework: { name: string } | null
      ai_synthesis_cache: { answers: AIAnswer[]; docs_analyzed_names: string[]; docs_total: number; docs_failed: { name: string; reason: string }[] } | null
      ai_synthesis_at: string | null
    } | null

    if (!mission) return jsonResponse({ error: 'Mission introuvable' }, 404)

    const { data: orgData } = await admin
      .from('organizations')
      .select('ai_analysis_enabled')
      .eq('id', mission.cabinet_id)
      .maybeSingle()
    const aiEnabled = (orgData as { ai_analysis_enabled?: boolean } | null)?.ai_analysis_enabled ?? true
    if (!aiEnabled) {
      return jsonResponse({
        answers: [], docs_analyzed: 0, docs_total: 0,
        docs_analyzed_names: [], docs_skipped: [], docs_failed: [],
        skipped_reason: 'cabinet_ai_disabled',
      })
    }

    // 2. Documents + métadonnées Passe 1 — chargés AVANT le check de cache
    // pour pouvoir détecter les docs en attente de Passe 1 et invalider le
    // cache obsolète automatiquement.
    const { data: docsData } = await admin
      .from('documents')
      .select('id, file_name, anthropic_file_id, anthropic_file_kind, ai_metadata, ai_extracted_at, ai_extract_error')
      .eq('mission_id', mission_id)
      .order('created_at', { ascending: false })

    let allDocs = (docsData ?? []) as DocRow[]
    if (allDocs.length === 0) {
      return jsonResponse({
        answers: [], docs_analyzed: 0, docs_total: 0,
        docs_analyzed_names: [], docs_skipped: [], docs_failed: [],
      })
    }

    // Inclut aussi les docs marqués en erreur transient (429/503/timeout) pour
    // qu'ils soient retentés. Les erreurs permanentes (no_file_id, no_tool_use,
    // unsupported, convert_error, file_not_found, anthropic_4xx hors 429) restent
    // filtrées pour ne pas boucler.
    const isTransientError = (code: string | null): boolean => {
      if (!code) return false
      return (
        code === 'anthropic_429'
        || code === 'anthropic_500'
        || code === 'anthropic_502'
        || code === 'anthropic_503'
        || code === 'anthropic_504'
        || code === 'anthropic_529'
        || code === 'timeout'
        || code.startsWith('fetch_')
      )
    }
    const pendingDocs = allDocs.filter(
      (d) => d.anthropic_file_id && !d.ai_extracted_at && (!d.ai_extract_error || isTransientError(d.ai_extract_error)),
    )

    // 3. Auto-backfill Passe 1 (impératif AVANT le cache : un cache produit
    //    sans métadonnées Passe 1 doit être balayé dès qu'on a la chance de
    //    refaire une synthèse de qualité).
    if (pendingDocs.length > 0) {
      console.log(`[smart-questionnaire] Auto-backfill: ${pendingDocs.length} doc(s) en attente de Passe 1`)
      await runBackfill(admin, pendingDocs.slice(0, BACKFILL_LIMIT))
      const { data: refreshed } = await admin
        .from('documents')
        .select('id, file_name, anthropic_file_id, anthropic_file_kind, ai_metadata, ai_extracted_at, ai_extract_error')
        .eq('mission_id', mission_id)
        .order('created_at', { ascending: false })
      allDocs = (refreshed ?? []) as DocRow[]
      const postExtracted = allDocs.filter((d) => d.ai_extracted_at).length
      const postFailed = allDocs.filter((d) => d.ai_extract_error).length
      const postPending = allDocs.filter((d) => d.anthropic_file_id && !d.ai_extracted_at && !d.ai_extract_error).length
      console.log(`[smart-questionnaire] Post-backfill: extracted=${postExtracted} failed=${postFailed} pending=${postPending}`)
    }

    // 4. Cache check (TTL 24h) — uniquement si AUCUN doc n'était en attente.
    //    Sinon le cache est forcément obsolète (produit sur un corpus sans
    //    métadonnées) et doit être recompilé.
    if (pendingDocs.length === 0 && mission.ai_synthesis_cache?.answers && mission.ai_synthesis_at) {
      const ageMs = Date.now() - new Date(mission.ai_synthesis_at).getTime()
      if (ageMs < CACHE_TTL_HOURS * 3600 * 1000) {
        const cached = mission.ai_synthesis_cache
        console.log(`[smart-questionnaire] Cache HIT (age=${(ageMs / 3600 / 1000).toFixed(1)}h)`)
        return jsonResponse({
          answers: (cached.answers ?? []).map((a) => ({ ...a, validated: false })),
          docs_analyzed: cached.docs_analyzed_names?.length ?? 0,
          docs_total: cached.docs_total ?? 0,
          docs_analyzed_names: cached.docs_analyzed_names ?? [],
          docs_skipped: [],
          docs_failed: cached.docs_failed ?? [],
          from_cache: true,
        })
      }
    }

    // 4. Contexte client
    const { data: clients } = await admin
      .from('cabinet_clients')
      .select('client_name, client_sector, effectifs, exigences_reglementaires, it_systems')
      .eq('cabinet_id', mission.cabinet_id)
      .eq('client_org_id', mission.client_id)
      .limit(1)

    const cc = clients?.[0] as {
      client_name: string
      client_sector: string | null
      effectifs: string | null
      exigences_reglementaires: { nom: string }[] | null
      it_systems: string[] | null
    } | undefined

    let clientContext = ''
    if (cc) {
      const regs = (cc.exigences_reglementaires ?? []).map((r) => r.nom).join(', ')
      clientContext = `Client: ${cc.client_name} | Secteur: ${cc.client_sector ?? '?'} | Taille: ${cc.effectifs ?? '?'} | IT: ${(cc.it_systems ?? []).join(', ') || '?'} | Réglementations: ${regs || 'aucune'} | Référentiel: ${mission.framework?.name ?? '?'}`
    }

    // 5. Caller user_id pour log
    const { data: callerProfile } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', caller.id)
      .maybeSingle()
    const logCtx = {
      mission_id,
      organization_id: mission.cabinet_id,
      user_id: (callerProfile as { id?: string } | null)?.id ?? null,
    }

    // 6. Mode : metadata-driven (préféré) ou fallback raw-doc
    const docsWithMeta = allDocs.filter((d) => d.ai_metadata && d.ai_extracted_at)
    const docsForFallback = allDocs.filter((d) => d.anthropic_file_id && !d.ai_metadata)
    const useMetadataMode = docsWithMeta.length >= Math.min(3, allDocs.length)

    const result = useMetadataMode
      ? await synthesizeWithMetadata(admin, anthropicKey, allDocs, docsWithMeta, questions, clientContext, logCtx)
      : await synthesizeWithRawDocs(admin, anthropicKey, docsForFallback.slice(0, FALLBACK_DOC_LIMIT), questions, clientContext, logCtx)

    // 7. Cache
    // deno-lint-ignore no-explicit-any
    await (admin.from('missions') as any)
      .update({
        ai_synthesis_cache: {
          answers: result.answers,
          docs_analyzed_names: result.docs_analyzed_names,
          docs_total: allDocs.length,
          docs_failed: result.docs_failed,
        },
        ai_synthesis_at: new Date().toISOString(),
      })
      .eq('id', mission_id)

    return jsonResponse({
      answers: result.answers.map((a) => ({ ...a, validated: false })),
      docs_analyzed: result.docs_analyzed_names.length,
      docs_total: allDocs.length,
      docs_analyzed_names: result.docs_analyzed_names,
      docs_skipped: [],
      docs_failed: result.docs_failed,
      mode: useMetadataMode ? 'metadata' : 'fallback',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[smart-questionnaire] Error:', message)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})

// ── MODE METADATA ──────────────────────────────────────────────────────────
// Envoie les ai_metadata résumées + les anthropic_file_id en pièces jointes
// (pour citation/vérif). Un seul appel Claude.

async function synthesizeWithMetadata(
  admin: SupabaseAdmin,
  anthropicKey: string,
  allDocs: DocRow[],
  docsWithMeta: DocRow[],
  questions: QuestionInput[],
  clientContext: string,
  logCtx: { mission_id: string; organization_id: string | null; user_id: string | null },
): Promise<{ answers: AIAnswer[]; docs_analyzed_names: string[]; docs_failed: { name: string; reason: string }[] }> {
  const corpusBlocks = docsWithMeta.map((d) => formatMetadataBlock(d))
  const failures = allDocs
    .filter((d) => d.ai_extract_error && !d.ai_metadata)
    .map((d) => ({ name: d.file_name, reason: d.ai_extract_error ?? 'extraction_failed' }))

  const questionsText = questions.map((q) => `- ${q.code}: ${q.label}${q.description ? ` (${q.description})` : ''}`).join('\n')

  const prompt = `Tu es un auditeur SI senior rigoureux. Tu disposes d'un corpus de documents fournis par le client avec leurs métadonnées extraites (Passe 1, signatures avec preuve visuelle).

${clientContext ? `CONTEXTE CLIENT: ${clientContext}\n` : ''}
CORPUS (${docsWithMeta.length} documents avec métadonnées vérifiées) :

${corpusBlocks.join('\n\n---\n\n')}

QUESTIONS :
${questionsText}

RÈGLES STRICTES :
1. Tu peux croiser les informations de plusieurs documents.

2. Pour evidence_type, applique CE QUI SUIT À LA LETTRE :
   - 'declared_with_signed_doc' : il existe ≥1 document qui (a) traite le sujet de la question dans une section dédiée ou via ses sujets clés ET (b) a au moins une signature avec preuve visuelle (champ "Signatures avec preuve" non vide) ET (c) a une formalité observée >= 70.
   - 'declared_with_doc' : un document traite le sujet mais ne remplit PAS toutes les conditions ci-dessus (ex: document non signé, ou formalité < 70, ou signature mentionnée sans preuve visuelle).
   - 'declared_only' : aucun document du corpus ne traite directement le sujet, ta réponse repose uniquement sur des mentions textuelles indirectes ou sur la synthèse générale d'un doc.

3. Une SIMPLE MENTION (« le RSSI a signé la PSSI ») dans un document non dédié au sujet NE compte PAS comme 'declared_with_signed_doc' — c'est 'declared_only'. Seule la présence d'un document dédié + signé (preuve visuelle) compte.

4. Confidence (0-100) :
   - 90-95 : plusieurs docs concordants signés avec preuve visuelle
   - 70-85 : un doc dédié signé avec preuve visuelle
   - 50-70 : un doc dédié non signé ou formalité moyenne
   - 25-45 : declared_only

5. Ne renvoie pas les questions sans aucune information disponible.

6. source_documents = noms exacts (file_name) du corpus. Vide pour declared_only.

Appelle UNIQUEMENT l'outil propose_answers.`

  // deno-lint-ignore no-explicit-any
  const content: any[] = []
  // Pièces jointes Anthropic Files API pour vérification (kind correct via 00089)
  for (const d of docsWithMeta.slice(0, 5)) {
    if (d.anthropic_file_id) {
      content.push({
        type: d.anthropic_file_kind ?? 'document',
        source: { type: 'file', file_id: d.anthropic_file_id },
      })
    }
  }
  content.push({ type: 'text', text: prompt })

  const out = await callClaudeWithTool(anthropicKey, content, logCtx, admin)
  if (!out.success) {
    return { answers: [], docs_analyzed_names: [], docs_failed: [...failures, { name: 'tous', reason: out.error ?? 'erreur IA' }] }
  }
  return {
    answers: out.answers,
    docs_analyzed_names: docsWithMeta.map((d) => d.file_name),
    docs_failed: failures,
  }
}

function formatMetadataBlock(d: DocRow): string {
  const m = d.ai_metadata!
  const signedSigs = m.signatures.filter((s) => s.signed)
  const sigSummary = m.signatures.length === 0
    ? 'aucune signature détectée'
    : `${signedSigs.length}/${m.signatures.length} signées avec preuve visuelle`
  // Détail des signatures signées (preuve concrète) — décisif pour evidence_type
  const sigDetail = signedSigs.length === 0
    ? ''
    : '\n- Signatures avec preuve : ' + signedSigs
        .slice(0, 3)
        .map((s) => `${s.role ?? '?'}${s.name ? ' (' + s.name + ')' : ''} → "${s.evidence?.quote ?? 'preuve visuelle'}"`)
        .join(' ; ')
  const versionDetail = m.version_evidence
    ? ` (${m.version_evidence.location} : "${m.version_evidence.quote}")`
    : ''
  return `Document: ${d.file_name}
- Synthèse: ${m.synthesis ?? '?'}
- Version: ${m.version ?? 'aucune'}${versionDetail} | Dernière révision: ${m.last_revision_date ?? '?'} | Pages: ${m.page_count ?? '?'}
- Formalité observée: ${m.formality_score ?? '?'}/100 | Signatures: ${sigSummary}${sigDetail}
- Scope déclaré: ${m.scope_declared ?? '?'}
- Sujets clés: ${m.key_topics.join(', ') || '?'}`
}

// ── BACKFILL ───────────────────────────────────────────────────────────────
// Invoque extract-document-metadata pour chaque doc en attente, avec
// concurrence bornée. await complet avant de rendre la main pour que la
// Passe 2 puisse exploiter les ai_metadata fraîchement écrits.

async function runBackfill(_admin: SupabaseAdmin, docs: DocRow[]): Promise<void> {
  // Direct fetch (au lieu de admin.functions.invoke) pour capturer le status
  // HTTP réel et le body d'erreur dans les logs — essentiel pour diagnostiquer
  // les échecs de la fonction cible (404 si non déployée, 500 si crash interne).
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const targetUrl = `${supabaseUrl}/functions/v1/extract-document-metadata`

  let cursor = 0
  const next = async (): Promise<void> => {
    while (cursor < docs.length) {
      const i = cursor++
      const doc = docs[i]
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
          body: JSON.stringify({ document_id: doc.id }),
        })
        if (!res.ok) {
          const bodyText = await res.text().catch(() => '<no body>')
          console.warn(`[smart-questionnaire] backfill doc ${doc.file_name}: status=${res.status} body=${bodyText.slice(0, 200)}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        console.warn(`[smart-questionnaire] backfill doc ${doc.file_name} threw:`, msg)
      }
    }
  }
  const workers = Array.from({ length: Math.min(BACKFILL_CONCURRENCY, docs.length) }, () => next())
  await Promise.all(workers)
}

// ── MODE FALLBACK ──────────────────────────────────────────────────────────
// Si aucune métadonnée Passe 1 disponible, envoie directement les fichiers.

async function synthesizeWithRawDocs(
  admin: SupabaseAdmin,
  anthropicKey: string,
  docs: DocRow[],
  questions: QuestionInput[],
  clientContext: string,
  logCtx: { mission_id: string; organization_id: string | null; user_id: string | null },
): Promise<{ answers: AIAnswer[]; docs_analyzed_names: string[]; docs_failed: { name: string; reason: string }[] }> {
  if (docs.length === 0) {
    return { answers: [], docs_analyzed_names: [], docs_failed: [{ name: 'aucun', reason: 'pas de document avec anthropic_file_id' }] }
  }

  const questionsText = questions.map((q) => `- ${q.code}: ${q.label}${q.description ? ` (${q.description})` : ''}`).join('\n')
  const docNames = docs.map((d) => `[${d.file_name}]`).join('; ')

  const prompt = `Tu es un auditeur SI senior. Analyse les documents joints pour pré-remplir un questionnaire de prise de connaissance.

${clientContext ? `CONTEXTE: ${clientContext}\n` : ''}
DOCUMENTS: ${docNames}

QUESTIONS :
${questionsText}

RÈGLES :
1. Pour evidence_type :
   - 'declared_with_signed_doc' : doc présente le sujet ET tu vois une signature/cachet/paraphe + en-tête formel
   - 'declared_with_doc' : doc traite le sujet mais signature/formalité absente
   - 'declared_only' : seule mention textuelle dans un doc non dédié
2. Pour confidence : 70-85 si doc direct, 25-45 si déclaration sans doc dédié.
3. Ne renvoie pas les questions sans information.
4. source_documents = noms exacts (file_name) ayant servi de source.

Appelle UNIQUEMENT l'outil propose_answers.`

  // deno-lint-ignore no-explicit-any
  const content: any[] = []
  for (const d of docs) {
    if (d.anthropic_file_id) {
      content.push({
        type: d.anthropic_file_kind ?? 'document',
        source: { type: 'file', file_id: d.anthropic_file_id },
      })
    }
  }
  content.push({ type: 'text', text: prompt })

  const out = await callClaudeWithTool(anthropicKey, content, logCtx, admin)
  if (!out.success) {
    return { answers: [], docs_analyzed_names: [], docs_failed: [{ name: 'tous', reason: out.error ?? 'erreur IA' }] }
  }
  return {
    answers: out.answers,
    docs_analyzed_names: docs.map((d) => d.file_name),
    docs_failed: [],
  }
}

// ── CLAUDE CALL ─────────────────────────────────────────────────────────────

// Backoff sur erreurs transient Anthropic. Attend 5s puis 15s puis 45s.
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000]
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 529])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callClaudeWithTool(
  anthropicKey: string,
  // deno-lint-ignore no-explicit-any
  content: any[],
  logCtx: { mission_id: string; organization_id: string | null; user_id: string | null },
  admin: SupabaseAdmin,
): Promise<{ success: true; answers: AIAnswer[] } | { success: false; error: string }> {
  const startedAt = Date.now()
  const reqBody = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    tools: [SYNTHESIZE_TOOL],
    tool_choice: { type: 'tool', name: 'propose_answers' },
    messages: [{ role: 'user', content }],
  })

  let res: Response | null = null
  let lastErrText = ''
  let lastStatus = 0
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), CLAUDE_TIMEOUT_MS)
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'files-api-2025-04-14,context-1m-2025-08-07',
        },
        signal: ctrl.signal,
        body: reqBody,
      })
      if (res.ok) break
      lastStatus = res.status
      lastErrText = await res.text().catch(() => '')
      if (!TRANSIENT_STATUSES.has(res.status) || attempt === RETRY_DELAYS_MS.length) break
      const retryAfterSec = Number(res.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? Math.min(retryAfterSec * 1000, 90_000)
        : RETRY_DELAYS_MS[attempt]
      console.warn(`[smart-questionnaire] Claude ${res.status}, retry in ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`)
      await sleep(waitMs)
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      lastErrText = isAbort ? 'timeout' : (err instanceof Error ? err.message : 'fetch_error')
      lastStatus = 0
      if (attempt === RETRY_DELAYS_MS.length) {
        void logAiCall({ admin, function_name: 'smart-questionnaire', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: lastErrText, duration_ms: Date.now() - startedAt, ...logCtx })
        return { success: false, error: isAbort ? 'timeout IA' : 'erreur réseau IA' }
      }
      console.warn(`[smart-questionnaire] fetch error, retry: ${lastErrText}`)
      await sleep(RETRY_DELAYS_MS[attempt])
    } finally {
      clearTimeout(timeout)
    }
  }

  if (!res || !res.ok) {
    console.error(`[smart-questionnaire] Claude ${lastStatus} (after retries):`, lastErrText.slice(0, 400))
    void logAiCall({ admin, function_name: 'smart-questionnaire', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${lastStatus}: ${lastErrText.slice(0, 200)}`, duration_ms: Date.now() - startedAt, ...logCtx })
    let reason = `IA ${lastStatus}`
    try {
      const j = JSON.parse(lastErrText)
      if (j?.error?.message) reason = j.error.message.slice(0, 100)
    } catch { /* keep default */ }
    return { success: false, error: reason }
  }

  const data = await res.json()
  const usage = data.usage ?? {}
  // deno-lint-ignore no-explicit-any
  const toolUse = (data.content ?? []).find((b: any) => b.type === 'tool_use' && b.name === 'propose_answers')

  void logAiCall({ admin, function_name: 'smart-questionnaire', model: data.model ?? MODEL, input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null, success: !!toolUse, error_message: toolUse ? null : 'no_tool_use', duration_ms: Date.now() - startedAt, ...logCtx })

  if (!toolUse?.input?.answers) {
    return { success: false, error: 'Réponse IA invalide' }
  }

  const raw = toolUse.input.answers as Array<{
    question_code: string
    question_label: string
    answer: string
    confidence: number
    evidence_type: EvidenceType
    source_documents: string[]
  }>

  const answers: AIAnswer[] = raw
    .filter((a) => a.question_code && a.answer)
    .map((a) => ({
      questionCode: a.question_code,
      questionLabel: a.question_label,
      answer: a.answer,
      confidence: Math.max(0, Math.min(100, Math.round(a.confidence ?? 0))),
      evidenceType: a.evidence_type,
      sourceDocs: a.source_documents ?? [],
    }))

  return { success: true, answers }
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
