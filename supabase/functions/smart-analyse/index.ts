import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function bufferToBase64(buffer: ArrayBuffer): string {
  // Use standard base64 encoding available in Deno
  const bytes = new Uint8Array(buffer)
  // Build binary string without spread operator (safe for large files)
  const parts: string[] = []
  const chunkSize = 4096
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length)
    let s = ''
    for (let j = i; j < end; j++) {
      s += String.fromCharCode(bytes[j])
    }
    parts.push(s)
  }
  return btoa(parts.join(''))
}

function detectMediaType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'pdf': return 'application/pdf'
    default: return null
  }
}

const MAX_DOCS = 3

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
    let documentEntries: { file_name: string; file_path: string; mime_type: string | null; file_size: number | null; description: string | null }[] = []

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
                // Match by domain prefix if possible
                const prefix = domain?.substring(0, 3)?.toUpperCase()
                const qPrefix = r.question_code.split('-')[0]?.toUpperCase()
                return !prefix || qPrefix === prefix || qPrefix === 'GOV' // always include governance
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

        // Fetch document entries
        const { data: docs } = await admin.from('documents')
          .select('file_name, file_path, mime_type, file_size, description')
          .eq('mission_id', mission_id)
          .order('created_at', { ascending: false }).limit(10)
        if (docs) documentEntries = docs as typeof documentEntries
      }
    }

    // ── 2. Download documents via signed URL + encode base64 (like SENCOMPLY) ─
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

    const contentParts: ContentBlock[] = []
    const docDescriptions: string[] = []
    let hasPdf = false

    for (const doc of documentEntries.slice(0, MAX_DOCS)) {
      const mediaType = detectMediaType(doc.file_name)
      if (!mediaType) {
        docDescriptions.push(`[${doc.file_name}] (format non support\u00e9)`)
        continue
      }

      try {
        // Get public URL (bucket must be public — like SENCOMPLY's 'attachments' bucket)
        const { data: urlData } = admin.storage.from('documents').getPublicUrl(doc.file_path)
        const fileUrl = urlData?.publicUrl
        if (!fileUrl) {
          docDescriptions.push(`[${doc.file_name}] (erreur URL)`)
          continue
        }

        // Download via fetch (streaming — like SENCOMPLY)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30_000)
        let fileRes: Response
        try {
          fileRes = await fetch(fileUrl, { signal: controller.signal })
        } finally {
          clearTimeout(timeout)
        }

        if (!fileRes.ok) {
          docDescriptions.push(`[${doc.file_name}] (t\u00e9l\u00e9chargement \u00e9chou\u00e9)`)
          continue
        }

        const buffer = await fileRes.arrayBuffer()
        const base64 = bufferToBase64(buffer)

        if (mediaType === 'application/pdf') {
          contentParts.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          })
          hasPdf = true
        } else {
          contentParts.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          })
        }

        docDescriptions.push(`[${doc.file_name}] \u2713 analys\u00e9 (${(buffer.byteLength / 1024 / 1024).toFixed(1)}Mo)`)
        console.log(`[smart-analyse] Encoded ${doc.file_name}: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}Mo`)

      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError'
        docDescriptions.push(`[${doc.file_name}] (${isAbort ? 'timeout' : 'erreur'})`)
        console.error(`[smart-analyse] Error for ${doc.file_name}:`, err)
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

${contentParts.length > 0 ? `Tu as re\u00e7u ${contentParts.length} document(s). ANALYSE-LES EN D\u00c9TAIL : sections, pages, chiffres, lacunes.` : ''}

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

    // ── 4. Call Claude with PDF beta header ──────────────────────────────────
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    }
    // CRITICAL: required for PDF analysis
    if (hasPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

    const claudeController = new AbortController()
    const claudeTimeout = setTimeout(() => claudeController.abort(), 120_000)

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
    } finally {
      clearTimeout(claudeTimeout)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[smart-analyse] Claude error:', claudeRes.status, errText.slice(0, 500))
      return new Response(JSON.stringify({ error: `Erreur Claude: ${claudeRes.status}` }),
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
      // Try to extract JSON from mixed content
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
      docs_analyzed: contentParts.length - 1, // minus the text prompt
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
