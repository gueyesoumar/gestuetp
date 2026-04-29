import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Clé API non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { mission_id, control_id, control_code, control_name, control_description, domain, observations, evidence_notes } = await req.json()

    if (!control_code || !control_name) {
      return new Response(JSON.stringify({ error: 'control_code et control_name requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 1. Fetch client context ──────────────────────────────────────────────
    let clientContext = ''
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
          clientContext = `Client: ${cc.client_name}, Secteur: ${cc.client_sector ?? '?'}, Taille: ${cc.effectifs ?? '?'}, IT: ${(cc.it_systems ?? []).join(', ')}, Réglementations: ${regs || 'aucune'}, Réf: ${m.framework?.name ?? '?'}`
        }
        const { data: risks } = await admin.from('mission_risks').select('title, risk_level').eq('mission_id', mission_id).limit(5)
        if (risks?.length) clientContext += `. Risques: ${risks.map((r: { risk_level: string; title: string }) => `[${r.risk_level}] ${r.title}`).join('; ')}`

        // Fetch relevant questionnaire responses for this control's domain
        const { data: qInstances } = await admin.from('questionnaire_instances').select('id').eq('mission_id', mission_id).limit(1)
        if (qInstances?.[0]) {
          const { data: qResps } = await admin.from('questionnaire_responses').select('question_code, response').eq('instance_id', qInstances[0].id)
          if (qResps?.length) {
            const relevant = qResps
              .filter((r: { question_code: string }) => {
                const prefix = domain?.substring(0, 3)?.toUpperCase()
                const qPrefix = r.question_code.split('-')[0]?.toUpperCase()
                return !prefix || qPrefix === prefix || qPrefix === 'GOV'
              })
              .slice(0, 5)
              .map((r: { question_code: string; response: Record<string, unknown> }) => {
                const val = (r.response as { value?: unknown })?.value
                return `${r.question_code}: ${String(val ?? '')}`
              })
            if (relevant.length > 0) {
              clientContext += `. Réponses questionnaire client: ${relevant.join('; ')}`
            }
          }
        }
      }
    }

    // ── 2. Fetch documents — priority to those tied to this control ──────────
    // Strategy:
    //  1. DEDIE  : docs whose documents.control_id matches the current control
    //              OR whose evidence_request_id points to an evidence_catalog
    //              row with control_id matching the current control. These
    //              are the client's primary evidence for the control under
    //              audit and MUST be the IA's main source.
    //  2. CONTEXTE: most recent mission docs (PSSI, charte, etc.) capped to
    //               fill out MAX_DOCS, used only for general context.
    // deno-lint-ignore no-explicit-any
    type ContentBlock = any
    // deno-lint-ignore no-explicit-any
    type DocRow = any

    const contentParts: ContentBlock[] = []
    const docDescriptions: string[] = []
    const MAX_DOCS = 5
    let pdfCount = 0
    let useFilesApi = false
    const MAX_PDFS = 1 // Claude Sonnet via URL: max 100 pages, limit to 1 PDF

    const dedicatedDocs: DocRow[] = []
    const dedicatedPaths = new Set<string>()
    let dedicatedCount = 0

    if (mission_id && control_id) {
      // 2.a — direct match documents.control_id
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

      // 2.b — match via evidence_request_id → evidence_catalog.control_id
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

          // Si le doc a un anthropic_file_id, il a déjà été converti à
          // l'upload (DOCX→TXT, XLSX→CSV, images natives) → on l'utilise
          // tel quel quel que soit le format d'origine. La conversion est
          // opaque côté smart-analyse.
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

          // Pas de file_id : fallback URL signée. Limité à PDF / images
          // natives car les autres formats ne sont pas acceptés tels quels
          // par Anthropic. L'utilisateur doit re-déclencher la conversion
          // via le bouton de ré-analyse côté admin (futur).
          if (!isImage && !isPdf) {
            docDescriptions.push(`[${role}] [${doc.file_name}] (format ${ext ?? '?'} : conversion IA en attente — relancer l'extraction)`)
            continue
          }

          if (isPdf) {
            if (pdfCount >= MAX_PDFS) {
              docDescriptions.push(`[${role}] [${doc.file_name}] (limité à ${MAX_PDFS} PDF en mode URL)`)
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
            console.log(`[smart-analyse] [${role}] URL for ${doc.file_name}`)
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
            console.log(`[smart-analyse] [${role}] image ${doc.file_name}`)
          }
        }
      }
    }

    // ── 3. Build prompt ──────────────────────────────────────────────────────
    const docsCtx = docDescriptions.length > 0 ? `\nDOCUMENTS: ${docDescriptions.join('; ')}` : ''
    const evidCtx = evidence_notes ? `\nNOTES PREUVES: ${evidence_notes}` : ''
    const dedicatedHint = dedicatedCount > 0
      ? `\n\nIMPORTANT — PIÈCES DÉDIÉES : ${dedicatedCount} document(s) marqué(s) [DEDIE] ci-dessus correspondent à la preuve attendue par ce contrôle (uploadés par le client en réponse à une demande de preuve précise). Tu DOIS les analyser EN PRIORITÉ comme source primaire d'information. Les documents [CONTEXTE] sont des références générales (PSSI, charte) à n'utiliser qu'en complément, jamais à la place des pièces dédiées.`
      : ''

    const prompt = `Tu es un auditeur SI senior. Analyse ce contrôle EN DÉTAIL en t'appuyant sur les documents fournis.

${clientContext ? `CONTEXTE: ${clientContext}\n` : ''}CONTRÔLE: ${control_code} — ${control_name}
Domaine: ${domain ?? 'N/A'}
Description: ${control_description ?? 'N/A'}
${observations ? `OBSERVATIONS: ${observations}` : ''}${evidCtx}${docsCtx}${dedicatedHint}

${contentParts.length > 0 ? `Tu as reçu ${contentParts.length} document(s). ANALYSE-LES EN DÉTAIL : sections, pages, chiffres, lacunes. Cite explicitement le nom de fichier de la pièce dédiée si elle existe.` : ''}

Génère un JSON avec :
1. "analysis_summary": ce que tu as analysé, sections identifiées, éléments clés trouvés. Cite les noms de fichiers analysés. 5-8 phrases.
2. "confidence": 0-100 (certitude de l'évaluation)
3. "maturity_level": "non_conforme"|"partiel"|"largement_conforme"|"conforme"|"non_applicable"
4. "maturity_justification": 1-2 phrases
5. "findings": constats détaillés citant les documents. 4-6 phrases.
6. "risk": risque concret pour ce client. 2-3 phrases.
7. "recommendations": actions numérotées. 3-5 points.

JSON uniquement, en français.`

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
        userMessage = 'Un des PDF dépasse la limite de 100 pages. Veuillez fournir des documents plus courts ou extraire les pages pertinentes.'
      } else if (errText.includes('Could not process')) {
        userMessage = 'Un des documents n’a pas pu être lu. Vérifiez qu’il n’est pas protégé par mot de passe.'
      } else if (errText.includes('too large')) {
        userMessage = 'Les documents fournis sont trop volumineux. Limite : 32 Mo par requête.'
      }

      void logAiCall({ admin, function_name: 'smart-analyse', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}: ${userMessage}`, duration_ms: Date.now() - startedAt, mission_id: mission_id ?? null, organization_id: cabinetIdForLog, user_id: null })
      return new Response(JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await claudeRes.json()
    void logAiCall({ admin, function_name: 'smart-analyse', model: MODEL, input_tokens: data.usage?.input_tokens ?? null, output_tokens: data.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, mission_id: mission_id ?? null, organization_id: cabinetIdForLog, user_id: null })
    const rawText = data.content?.[0]?.text ?? ''
    const clean = rawText.replace(/```json|```/g, '').trim()

    // ── 5. Parse response ────────────────────────────────────────────────────
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(clean)
    } catch {
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch {
          console.error('[smart-analyse] Parse failed:', clean.slice(0, 300))
          return new Response(JSON.stringify({ error: 'Réponse IA invalide' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        return new Response(JSON.stringify({ error: 'Réponse IA invalide' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    return new Response(JSON.stringify({
      analysis_summary: parsed.analysis_summary ?? '',
      confidence: parsed.confidence ?? 0,
      maturity_level: parsed.maturity_level ?? 'partiel',
      maturity_justification: parsed.maturity_justification ?? '',
      findings: parsed.findings ?? '',
      recommendations: parsed.recommendations ?? '',
      risk: parsed.risk ?? '',
      docs_analyzed: contentParts.length - 1,
      dedicated_docs: dedicatedCount,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error('[smart-analyse] Error:', message)
    return new Response(
      JSON.stringify({ error: isAbort ? 'Délai dépassé — réessayez' : message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
