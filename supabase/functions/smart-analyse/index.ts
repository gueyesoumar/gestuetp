import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Cl\u00e9 API non configur\u00e9e' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { mission_id, control_code, control_name, control_description, domain, observations, evidence_notes } = await req.json()

    if (!control_code || !control_name) {
      return new Response(JSON.stringify({ error: 'control_code et control_name requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── 1. Fetch client context ──────────────────────────────────────────────
    let clientContext = ''

    if (mission_id) {
      const { data: m } = await admin.from('missions').select('client_id, framework:frameworks(name)').eq('id', mission_id).single()
      if (m) {
        const { data: ccs } = await admin.from('cabinet_clients')
          .select('client_name, client_sector, effectifs, exigences_reglementaires, it_systems, it_environment')
          .eq('client_org_id', m.client_id).limit(1)
        const cc = ccs?.[0]
        if (cc) {
          const regs = (cc.exigences_reglementaires ?? []).map((r: { nom: string }) => r.nom).join(', ')
          clientContext = `Client: ${cc.client_name}, Secteur: ${cc.client_sector ?? '?'}, Taille: ${cc.effectifs ?? '?'}, IT: ${(cc.it_systems ?? []).join(', ')}, R\u00e9glementations: ${regs || 'aucune'}, R\u00e9f: ${m.framework?.name ?? '?'}`
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
              clientContext += `. R\u00e9ponses questionnaire client: ${relevant.join('; ')}`
            }
          }
        }
      }
    }

    // ── 2. Fetch documents and generate signed URLs (no memory load) ─────────
    // deno-lint-ignore no-explicit-any
    type ContentBlock = any

    const contentParts: ContentBlock[] = []
    const docDescriptions: string[] = []
    const MAX_DOCS = 5
    let pdfCount = 0
    let useFilesApi = false
    const MAX_PDFS = 1 // Claude Sonnet via URL: max 100 pages, limit to 1 PDF

    if (mission_id) {
      const { data: docs } = await admin.from('documents')
        .select('file_name, file_path, mime_type, file_size, anthropic_file_id')
        .eq('mission_id', mission_id)
        .order('created_at', { ascending: false }).limit(10)

      if (docs?.length) {
        for (const doc of docs.slice(0, MAX_DOCS)) {
          const ext = doc.file_name.split('.').pop()?.toLowerCase()
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')
          const isPdf = ext === 'pdf'

          if (!isImage && !isPdf) {
            docDescriptions.push(`[${doc.file_name}] (format non support\u00e9)`)
            continue
          }

          // Strategy: prefer Files API (file_id) > signed URL fallback
          if (doc.anthropic_file_id) {
            // Files API — no memory, no page limit concern
            contentParts.push({
              type: 'document',
              source: { type: 'file', file_id: doc.anthropic_file_id },
            })
            useFilesApi = true
            const sizeMb = doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)}Mo` : '?'
            docDescriptions.push(`[${doc.file_name}] \u2713 via Files API (${sizeMb})`)
            console.log(`[smart-analyse] Using file_id ${doc.anthropic_file_id} for ${doc.file_name}`)
          } else if (isPdf) {
            // URL fallback for PDFs — limited to 1 PDF, max 10MB
            if (pdfCount >= MAX_PDFS) {
              docDescriptions.push(`[${doc.file_name}] (limit\u00e9 \u00e0 ${MAX_PDFS} PDF par analyse en mode URL. Utilisez l'upload IA pour les gros documents.)`)
              continue
            }
            if (doc.file_size && doc.file_size > 10 * 1024 * 1024) {
              docDescriptions.push(`[${doc.file_name}] (trop volumineux pour le mode URL : ${(doc.file_size / 1024 / 1024).toFixed(1)}Mo. Utilisez l'upload IA.)`)
              continue
            }
            const { data: signedData, error: signErr } = await admin.storage
              .from('documents')
              .createSignedUrl(doc.file_path, 3600)
            if (signErr || !signedData?.signedUrl) {
              docDescriptions.push(`[${doc.file_name}] (erreur URL)`)
              continue
            }
            contentParts.push({
              type: 'document',
              source: { type: 'url', url: signedData.signedUrl },
            })
            pdfCount++
            docDescriptions.push(`[${doc.file_name}] \u2713 via URL`)
          } else {
            // Images via URL
            const { data: signedData, error: signErr } = await admin.storage
              .from('documents')
              .createSignedUrl(doc.file_path, 3600)
            if (signErr || !signedData?.signedUrl) {
              docDescriptions.push(`[${doc.file_name}] (erreur URL)`)
              continue
            }
            const mediaTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }
            contentParts.push({
              type: 'image',
              source: { type: 'url', url: signedData.signedUrl, media_type: mediaTypes[ext ?? ''] ?? 'image/jpeg' },
            })
            docDescriptions.push(`[${doc.file_name}] \u2713 image`)
          }

          const sizeMb = doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)}Mo` : '?'
          docDescriptions.push(`[${doc.file_name}] \u2713 (${sizeMb})`)
          console.log(`[smart-analyse] Added ${doc.file_name} via signed URL (${sizeMb})`)
        }
      }
    }

    // ── 3. Build prompt ──────────────────────────────────────────────────────
    const docsCtx = docDescriptions.length > 0 ? `\nDOCUMENTS: ${docDescriptions.join('; ')}` : ''
    const evidCtx = evidence_notes ? `\nNOTES PREUVES: ${evidence_notes}` : ''

    const prompt = `Tu es un auditeur SI senior. Analyse ce contr\u00f4le EN D\u00c9TAIL en t'appuyant sur les documents fournis.

${clientContext ? `CONTEXTE: ${clientContext}\n` : ''}CONTR\u00d4LE: ${control_code} \u2014 ${control_name}
Domaine: ${domain ?? 'N/A'}
Description: ${control_description ?? 'N/A'}
${observations ? `OBSERVATIONS: ${observations}` : ''}${evidCtx}${docsCtx}

${contentParts.length > 0 ? `Tu as re\u00e7u ${contentParts.length} document(s) via URL. ANALYSE-LES EN D\u00c9TAIL : sections, pages, chiffres, lacunes.` : ''}

G\u00e9n\u00e8re un JSON avec :
1. "analysis_summary": ce que tu as analys\u00e9, sections identifi\u00e9es, \u00e9l\u00e9ments cl\u00e9s trouv\u00e9s. 5-8 phrases.
2. "confidence": 0-100 (certitude de l'\u00e9valuation)
3. "maturity_level": "non_conforme"|"partiel"|"largement_conforme"|"conforme"|"non_applicable"
4. "maturity_justification": 1-2 phrases
5. "findings": constats d\u00e9taill\u00e9s citant les documents. 4-6 phrases.
6. "risk": risque concret pour ce client. 2-3 phrases.
7. "recommendations": actions num\u00e9rot\u00e9es. 3-5 points.

JSON uniquement, en fran\u00e7ais.`

    contentParts.push({ type: 'text', text: prompt })

    console.log('[smart-analyse] Content blocks:', contentParts.map((p: { type: string }) => p.type).join(', '))

    // ── 4. Call Claude API ───────────────────────────────────────────────────
    const claudeController = new AbortController()
    const claudeTimeout = setTimeout(() => claudeController.abort(), 120_000)

    let claudeRes: Response
    try {
      const claudeHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      }
      const betaFlags: string[] = ['context-1m-2025-08-07'] // 1M context window for Sonnet 4.6
      if (useFilesApi) betaFlags.push('files-api-2025-04-14')
      claudeHeaders['anthropic-beta'] = betaFlags.join(',')

      claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: claudeHeaders,
        signal: claudeController.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
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

      // Handle specific Claude errors with user-friendly messages
      let userMessage = `Erreur d'analyse (${claudeRes.status})`
      if (errText.includes('PDF pages')) {
        userMessage = 'Un des PDF d\u00e9passe la limite de 100 pages. Veuillez fournir des documents plus courts ou extraire les pages pertinentes.'
      } else if (errText.includes('Could not process')) {
        userMessage = 'Un des documents n\u2019a pas pu \u00eatre lu. V\u00e9rifiez qu\u2019il n\u2019est pas prot\u00e9g\u00e9 par mot de passe.'
      } else if (errText.includes('too large')) {
        userMessage = 'Les documents fournis sont trop volumineux. Limite : 32 Mo par requ\u00eate.'
      }

      return new Response(JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await claudeRes.json()
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
          return new Response(JSON.stringify({ error: 'R\u00e9ponse IA invalide' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        return new Response(JSON.stringify({ error: 'R\u00e9ponse IA invalide' }),
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
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error('[smart-analyse] Error:', message)
    return new Response(
      JSON.stringify({ error: isAbort ? 'D\u00e9lai d\u00e9pass\u00e9 \u2014 r\u00e9essayez' : message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
