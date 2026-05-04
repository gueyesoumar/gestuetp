import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

// ============================================================================
// Types & validators
// ============================================================================
type Classification = 'major_nc' | 'minor_nc' | 'observation' | 'strength'
type Priority = 'critical' | 'high' | 'medium' | 'low'

const VALID_CLASSIFICATIONS: readonly Classification[] = ['major_nc', 'minor_nc', 'observation', 'strength']
const VALID_PRIORITIES: readonly Priority[] = ['critical', 'high', 'medium', 'low']
const MAX_FINDINGS = 10

interface AiFinding {
  classification: Classification
  description: string
  risk: string | null
  recommendation: string | null
  priority: Priority | null
  proposed_deadline_days: number | null
}

interface ChecklistItem {
  label: string
  hint?: string
  evidence_type?: string
}

function validateFinding(raw: unknown): AiFinding | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Record<string, unknown>

  const description = typeof f.description === 'string' ? f.description.trim() : ''
  if (description.length < 10) return null

  const classification: Classification =
    typeof f.classification === 'string' && (VALID_CLASSIFICATIONS as readonly string[]).includes(f.classification)
      ? f.classification as Classification
      : 'observation'

  const priority: Priority | null =
    typeof f.priority === 'string' && (VALID_PRIORITIES as readonly string[]).includes(f.priority)
      ? f.priority as Priority
      : null

  const risk = typeof f.risk === 'string' && f.risk.trim() ? f.risk.trim() : null
  const recommendation = typeof f.recommendation === 'string' && f.recommendation.trim() ? f.recommendation.trim() : null
  const deadlineRaw = f.proposed_deadline_days
  const proposed_deadline_days =
    typeof deadlineRaw === 'number' && Number.isFinite(deadlineRaw) && deadlineRaw > 0 && deadlineRaw <= 3650
      ? Math.round(deadlineRaw)
      : null

  return { classification, description, risk, recommendation, priority, proposed_deadline_days }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Cle API non configuree' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const callerAuth = req.headers.get('Authorization') ?? ''

    const { mission_id, control_id, control_code, control_name, control_description, domain, observations, evidence_notes } = await req.json()

    if (!control_code || !control_name) {
      return new Response(JSON.stringify({ error: 'control_code et control_name requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 1. Fetch client context ──────────────────────────────────────────────
    let clientContext = ''
    let cadrageResponsesText = ''
    let cabinetIdForLog: string | null = null

    if (mission_id) {
      const { data: m } = await admin.from('missions').select('client_id, cabinet_id, framework:frameworks(name)').eq('id', mission_id).single()
      cabinetIdForLog = (m as { cabinet_id?: string } | null)?.cabinet_id ?? null
      if (m) {
        const { data: ccs } = await admin.from('cabinet_clients')
          .select('client_name, client_sector, effectifs, exigences_reglementaires, it_systems, it_environment')
          .eq('client_org_id', m.client_id).limit(1)
        const cc = ccs?.[0]
        if (cc) {
          const regs = (cc.exigences_reglementaires ?? []).map((r: { nom: string }) => r.nom).join(', ')
          clientContext = `Client: ${cc.client_name}, Secteur: ${cc.client_sector ?? '?'}, Taille: ${cc.effectifs ?? '?'}, IT: ${(cc.it_systems ?? []).join(', ')}, Reglementations: ${regs || 'aucune'}, Ref: ${m.framework?.name ?? '?'}`
        }
        const { data: risks } = await admin.from('mission_risks').select('title, risk_level').eq('mission_id', mission_id).limit(5)
        if (risks?.length) clientContext += `. Risques: ${risks.map((r: { risk_level: string; title: string }) => `[${r.risk_level}] ${r.title}`).join('; ')}`

        // Reponses cadrage liees a CE controle via la table question_controls
        // (remplace l'heuristique de prefixe domain.substring qui etait fragile).
        const { data: qInstances } = await admin.from('questionnaire_instances').select('id').eq('mission_id', mission_id).limit(1)
        if (qInstances?.[0] && control_id) {
          const { data: links } = await admin.from('question_controls')
            .select('question_id, weight')
            .eq('control_id', control_id)

          if (links && links.length > 0) {
            const weightMap = new Map<string, number>()
            for (const l of links as Array<{ question_id: string; weight: number }>) {
              weightMap.set(l.question_id, l.weight)
            }
            const questionIds = Array.from(weightMap.keys())

            const { data: responses } = await admin.from('questionnaire_responses')
              .select('question_id, question_code, response')
              .eq('instance_id', qInstances[0].id)
              .in('question_id', questionIds)

            if (responses && responses.length > 0) {
              const weightLabel = (w: number) => w >= 3 ? 'PREUVE FORTE' : w === 2 ? 'PARTIEL' : 'CONTEXTE'
              cadrageResponsesText = (responses as Array<{ question_id: string; question_code: string; response: Record<string, unknown> }>)
                .slice(0, 8)
                .map((r) => {
                  const w = weightMap.get(r.question_id) ?? 1
                  const val = (r.response as { value?: unknown })?.value
                  return `[${weightLabel(w)}] ${r.question_code}: ${String(val ?? '')}`
                })
                .join('\n')
            }
          }
        }
      }
    }

    // ── 1bis. Fetch audit_checklist du controle ──────────────────────────────
    let auditChecklistText = ''
    if (control_id) {
      const { data: ctrl } = await admin.from('controls')
        .select('audit_checklist')
        .eq('id', control_id)
        .single()
      const checklist = (ctrl as { audit_checklist?: unknown } | null)?.audit_checklist
      if (Array.isArray(checklist) && checklist.length > 0) {
        auditChecklistText = (checklist as ChecklistItem[])
          .filter((it) => it && typeof it.label === 'string' && it.label.trim())
          .map((it) => {
            const ev = it.evidence_type ? ` [preuve: ${it.evidence_type}]` : ''
            const hint = it.hint ? ` (${it.hint})` : ''
            return `- ${it.label}${ev}${hint}`
          })
          .join('\n')
      }
    }

    // ── 2. Fetch documents — priority to those tied to this control ──────────
    // deno-lint-ignore no-explicit-any
    type ContentBlock = any
    // deno-lint-ignore no-explicit-any
    type DocRow = any

    const contentParts: ContentBlock[] = []
    const docDescriptions: string[] = []
    const MAX_DOCS = 5
    let pdfCount = 0
    let useFilesApi = false
    const MAX_PDFS = 1

    const dedicatedDocs: DocRow[] = []
    const dedicatedPaths = new Set<string>()
    let dedicatedCount = 0

    if (mission_id && control_id) {
      const { data: directDocs } = await admin.from('documents')
        .select('file_name, file_path, mime_type, file_size, anthropic_file_id, anthropic_file_kind, evidence_request_id')
        .eq('mission_id', mission_id)
        .eq('control_id', control_id)
        .order('created_at', { ascending: false })
      for (const d of (directDocs ?? []) as DocRow[]) {
        if (!dedicatedPaths.has(d.file_path)) {
          dedicatedDocs.push(d)
          dedicatedPaths.add(d.file_path)
        }
      }

      const { data: viaEvidence } = await admin.from('documents')
        .select(`
          file_name, file_path, mime_type, file_size, anthropic_file_id, anthropic_file_kind, evidence_request_id,
          evidence_request:mission_evidence_requests!evidence_request_id (
            evidence_catalog:evidence_catalog!evidence_catalog_id ( control_id )
          )
        `)
        .eq('mission_id', mission_id)
        .not('evidence_request_id', 'is', null)
        .order('created_at', { ascending: false })
      for (const d of (viaEvidence ?? []) as DocRow[]) {
        const ctrlId = d.evidence_request?.evidence_catalog?.control_id
        if (ctrlId === control_id && !dedicatedPaths.has(d.file_path)) {
          dedicatedDocs.push(d)
          dedicatedPaths.add(d.file_path)
        }
      }
      dedicatedCount = dedicatedDocs.length

      const dedicatedNeedingUpload = dedicatedDocs.filter((d) => !d.anthropic_file_id)
      if (dedicatedNeedingUpload.length > 0 && callerAuth) {
        console.log(`[smart-analyse] Self-heal: triggering upload for ${dedicatedNeedingUpload.length} dedicated doc(s) without file_id`)
        const uploadUrl = `${supabaseUrl}/functions/v1/ai-documents`
        for (const doc of dedicatedNeedingUpload) {
          const { data: docRow } = await admin
            .from('documents')
            .select('id')
            .eq('file_path', doc.file_path)
            .single()
          const docId = (docRow as { id?: string } | null)?.id
          if (!docId) {
            console.warn(`[smart-analyse] self-heal: cannot resolve doc id for ${doc.file_name}`)
            continue
          }
          try {
            const res = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': callerAuth,
                'apikey': anonKey,
              },
              body: JSON.stringify({ action: 'upload', document_id: docId }),
            })
            if (!res.ok) {
              const body = await res.text().catch(() => '')
              console.warn(`[smart-analyse] self-heal upload failed for ${doc.file_name}: status=${res.status} body=${body.slice(0, 200)}`)
              continue
            }
            const out = await res.json() as { file_id?: string; kind?: 'document' | 'image' }
            if (out.file_id) {
              doc.anthropic_file_id = out.file_id
              doc.anthropic_file_kind = out.kind ?? 'document'
              console.log(`[smart-analyse] self-heal OK for ${doc.file_name} -> ${out.file_id}`)
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'unknown'
            console.warn(`[smart-analyse] self-heal threw for ${doc.file_name}: ${msg}`)
          }
        }
      }
    }

    let docs: DocRow[] = []
    if (mission_id) {
      const { data: otherDocs } = await admin.from('documents')
        .select('file_name, file_path, mime_type, file_size, anthropic_file_id, anthropic_file_kind, evidence_request_id')
        .eq('mission_id', mission_id)
        .order('created_at', { ascending: false }).limit(10)
      const generalDocs = ((otherDocs ?? []) as DocRow[]).filter((d) => !dedicatedPaths.has(d.file_path))
      docs = [...dedicatedDocs, ...generalDocs]
      console.log(`[smart-analyse] dedicated=${dedicatedCount} general=${generalDocs.length} for control_id=${control_id ?? 'none'}`)

      if (docs.length > 0) {
        for (const doc of docs.slice(0, MAX_DOCS)) {
          const ext = doc.file_name.split('.').pop()?.toLowerCase()
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')
          const isPdf = ext === 'pdf'
          const role = dedicatedPaths.has(doc.file_path) ? 'DEDIE' : 'CONTEXTE'
          const sizeMb = doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)}Mo` : '?'

          if (doc.anthropic_file_id) {
            const kind: 'document' | 'image' = doc.anthropic_file_kind === 'image' ? 'image' : 'document'
            contentParts.push({
              type: kind,
              source: { type: 'file', file_id: doc.anthropic_file_id },
            })
            useFilesApi = true
            docDescriptions.push(`[${role}] [${doc.file_name}] OK Files API (${sizeMb}, kind=${kind})`)
            console.log(`[smart-analyse] [${role}] file_id ${doc.anthropic_file_id} kind=${kind} for ${doc.file_name}`)
            continue
          }

          if (!isImage && !isPdf) {
            docDescriptions.push(`[${role}] [${doc.file_name}] (format ${ext ?? '?'} : conversion IA en attente)`)
            console.warn(`[smart-analyse] [${role}] SKIPPED ${doc.file_name} (format ${ext ?? '?'}, no anthropic_file_id)`)
            continue
          }

          if (isPdf) {
            if (pdfCount >= MAX_PDFS) {
              docDescriptions.push(`[${role}] [${doc.file_name}] (limite a ${MAX_PDFS} PDF en mode URL)`)
              continue
            }
            if (doc.file_size && doc.file_size > 10 * 1024 * 1024) {
              docDescriptions.push(`[${role}] [${doc.file_name}] (trop volumineux pour mode URL : ${sizeMb})`)
              continue
            }
            const { data: signedData, error: signErr } = await admin.storage
              .from('documents').createSignedUrl(doc.file_path, 3600)
            if (signErr || !signedData?.signedUrl) {
              docDescriptions.push(`[${role}] [${doc.file_name}] (erreur URL)`)
              continue
            }
            contentParts.push({
              type: 'document',
              source: { type: 'url', url: signedData.signedUrl },
            })
            pdfCount++
            docDescriptions.push(`[${role}] [${doc.file_name}] OK URL (${sizeMb})`)
          } else {
            const { data: signedData, error: signErr } = await admin.storage
              .from('documents').createSignedUrl(doc.file_path, 3600)
            if (signErr || !signedData?.signedUrl) {
              docDescriptions.push(`[${role}] [${doc.file_name}] (erreur URL)`)
              continue
            }
            const mediaTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }
            contentParts.push({
              type: 'image',
              source: { type: 'url', url: signedData.signedUrl, media_type: mediaTypes[ext ?? ''] ?? 'image/jpeg' },
            })
            docDescriptions.push(`[${role}] [${doc.file_name}] OK image (${sizeMb})`)
          }
        }
      }
    }

    // ── 3. Build prompt (sections-based, only include what we have) ──────────
    const promptSections: string[] = []
    if (clientContext) promptSections.push(`CONTEXTE CLIENT:\n${clientContext}`)

    promptSections.push(
      `CONTROLE: ${control_code} — ${control_name}\n` +
      `Domaine: ${domain ?? 'N/A'}\n` +
      `Description: ${control_description ?? 'N/A'}`
    )

    if (auditChecklistText) {
      promptSections.push(`POINTS A VERIFIER (checklist d'audit normative) :\n${auditChecklistText}`)
    }
    if (cadrageResponsesText) {
      promptSections.push(`REPONSES CADRAGE LIEES (du questionnaire client) :\n${cadrageResponsesText}`)
    }
    if (observations) promptSections.push(`OBSERVATIONS DE L'AUDITEUR:\n${observations}`)
    if (evidence_notes) promptSections.push(`NOTES PREUVES:\n${evidence_notes}`)
    if (docDescriptions.length > 0) promptSections.push(`DOCUMENTS:\n${docDescriptions.join('\n')}`)
    if (dedicatedCount > 0) {
      promptSections.push(
        `IMPORTANT — PIECES DEDIEES : ${dedicatedCount} document(s) marque(s) [DEDIE] correspondent ` +
        `a la preuve attendue par ce controle (uploades par le client en reponse a une demande de preuve precise). ` +
        `Tu DOIS les analyser EN PRIORITE comme source primaire. Les [CONTEXTE] sont des references generales, ` +
        `a n'utiliser qu'en complement.`
      )
    }
    if (contentParts.length > 0) {
      promptSections.push(
        `Tu as recu ${contentParts.length} document(s). ANALYSE-LES EN DETAIL : sections, pages, chiffres, lacunes. ` +
        `Cite explicitement le nom de fichier de chaque piece dediee.`
      )
    }

    const promptIntro = `Tu es un auditeur SI senior. Analyse ce controle EN DETAIL en t'appuyant sur les documents fournis et la checklist d'audit normative.`

    const promptInstructions = `Genere un JSON avec :

1. "analysis_summary": ce que tu as analyse (5-8 phrases). Cite les fichiers analyses et les points-cles releves.

2. "confidence": 0-100 (certitude de l'evaluation)

3. "maturity_level": "non_conforme" | "partiel" | "largement_conforme" | "conforme" | "non_applicable"

4. "maturity_justification": 1-2 phrases

5. "findings": ARRAY de constats individuels. Un constat = un ecart isole, une observation, ou un point fort. Decompose chaque probleme distinct en finding separe (ex : PSSI obsolete + comptes admin non revus = 2 findings distincts).

   Chaque finding (objet JSON) :
   - "classification": "major_nc" (NC majeure, ecart critique) | "minor_nc" (NC mineure, ecart contenu) | "observation" (a surveiller, pas un ecart formel) | "strength" (point fort)
   - "description": le constat lui-meme, factuel, 2-4 phrases. Format Markdown limite (**gras**, *italique*, listes "- point", \`code\`). Cite les documents et les ecarts entre declaration cadrage et preuves observees.
   - "risk": risque concret pour ce client (1-2 phrases) ou null pour observation/strength
   - "recommendation": action concrete (1-2 phrases) ou null pour observation/strength
   - "priority": "critical" (corriger sous 30j) | "high" (90j) | "medium" (180j) | "low" (suivi annuel) ou null pour strength
   - "proposed_deadline_days": nombre de jours depuis aujourd'hui pour la correction (ex: 30, 90, 180, 365) ou null pour strength

   Cas particuliers :
   - 0 findings si conformite totale ET aucune observation a signaler
   - 0 findings si non_applicable
   - Melange possible : 1 major_nc + 2 minor_nc + 1 observation + 1 strength

JSON uniquement, en francais. Maximum ${MAX_FINDINGS} findings.`

    const prompt = promptIntro + '\n\n' + promptSections.join('\n\n') + '\n\n' + promptInstructions

    contentParts.push({ type: 'text', text: prompt })

    console.log('[smart-analyse] Content blocks:', contentParts.map((p: { type: string }) => p.type).join(', '))

    // ── 4. Call Claude API ───────────────────────────────────────────────────
    const claudeController = new AbortController()
    const claudeTimeout = setTimeout(() => claudeController.abort(), 120_000)
    const startedAt = Date.now()
    const MODEL = 'claude-sonnet-4-20250514'

    let claudeRes: Response
    try {
      const claudeHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      }
      const betaFlags: string[] = ['context-1m-2025-08-07']
      if (useFilesApi) betaFlags.push('files-api-2025-04-14')
      claudeHeaders['anthropic-beta'] = betaFlags.join(',')

      claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: claudeHeaders,
        signal: claudeController.signal,
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4000,
          messages: [{ role: 'user', content: contentParts }],
        }),
      })
    } finally {
      clearTimeout(claudeTimeout)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[smart-analyse] Claude error:', claudeRes.status, errText)

      let userMessage = `Erreur d'analyse (${claudeRes.status})`
      if (errText.includes('PDF pages')) {
        userMessage = 'Un des PDF depasse la limite de 100 pages. Veuillez fournir des documents plus courts ou extraire les pages pertinentes.'
      } else if (errText.includes('Could not process')) {
        userMessage = 'Un des documents n\'a pas pu etre lu. Verifiez qu\'il n\'est pas protege par mot de passe.'
      } else if (errText.includes('too large')) {
        userMessage = 'Les documents fournis sont trop volumineux. Limite : 32 Mo par requete.'
      }

      void logAiCall({ admin, function_name: 'smart-analyse', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}: ${userMessage}`, duration_ms: Date.now() - startedAt, mission_id: mission_id ?? null, organization_id: cabinetIdForLog, user_id: null })
      return new Response(JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await claudeRes.json()
    void logAiCall({ admin, function_name: 'smart-analyse', model: MODEL, input_tokens: data.usage?.input_tokens ?? null, output_tokens: data.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, mission_id: mission_id ?? null, organization_id: cabinetIdForLog, user_id: null })
    const rawText = data.content?.[0]?.text ?? ''
    const clean = rawText.replace(/```json|```/g, '').trim()

    // ── 5. Parse + validate response ─────────────────────────────────────────
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(clean)
    } catch {
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch {
          console.error('[smart-analyse] Parse failed:', clean.slice(0, 300))
          return new Response(JSON.stringify({ error: 'Reponse IA invalide' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        return new Response(JSON.stringify({ error: 'Reponse IA invalide' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Validate findings array
    const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : []
    const findings: AiFinding[] = rawFindings
      .slice(0, MAX_FINDINGS)
      .map(validateFinding)
      .filter((f): f is AiFinding => f !== null)

    if (rawFindings.length !== findings.length) {
      console.warn(`[smart-analyse] Filtered ${rawFindings.length - findings.length} invalid finding(s) out of ${rawFindings.length}`)
    }

    return new Response(JSON.stringify({
      analysis_summary: typeof parsed.analysis_summary === 'string' ? parsed.analysis_summary : '',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, parsed.confidence)) : 0,
      maturity_level: typeof parsed.maturity_level === 'string' ? parsed.maturity_level : 'partiel',
      maturity_justification: typeof parsed.maturity_justification === 'string' ? parsed.maturity_justification : '',
      findings,
      docs_analyzed: contentParts.length - 1,
      dedicated_docs: dedicatedCount,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error('[smart-analyse] Error:', message)
    return new Response(
      JSON.stringify({ error: isAbort ? 'Delai depasse — reessayez' : message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
