import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

/**
 * Edge Function : extract-org-chart-actors
 *
 * Phase F de la refonte des Entretiens. L'auditeur uploade l'organigramme du
 * client (PDF ou image). Claude Vision extrait les acteurs SI : nom, fonction,
 * direction, email/telephone si visibles.
 *
 * Securite :
 *  - Auth Supabase obligatoire
 *  - Cle Anthropic cote serveur uniquement
 *  - Limites : 1 fichier, 10 Mo max
 *  - Validation stricte du JSON renvoye par Claude
 *
 * Le frontend recoit la liste de suggestions et propose a l'auditeur de valider
 * avant insertion dans client_contacts.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_BETA = 'files-api-2025-04-14'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_SUGGESTIONS = 30

interface ExtractedActor {
  name: string
  job_title: string | null
  department: string | null
  email: string | null
  phone: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autorise' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return jsonResponse({ error: 'Non autorise' }, 401)

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) return jsonResponse({ error: 'Cle API Anthropic non configuree' }, 500)

    const formData = await req.formData()
    const missionId = formData.get('mission_id')
    if (typeof missionId !== 'string' || missionId.length === 0) {
      return jsonResponse({ error: 'mission_id requis' }, 400)
    }
    const file = formData.get('file')
    if (!(file instanceof File)) return jsonResponse({ error: 'fichier requis' }, 400)
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse({ error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)` }, 400)
    }

    // Validation : doit etre PDF ou image
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      return jsonResponse({ error: 'Format non supporte (PDF ou image attendus)' }, 400)
    }

    // 1. Upload du fichier vers Anthropic Files API
    const fd = new FormData()
    fd.append('file', file, file.name)
    const upRes = await fetch(`${ANTHROPIC_API}/files`, {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-beta': ANTHROPIC_BETA },
      body: fd,
    })
    if (!upRes.ok) {
      const errText = await upRes.text()
      console.error('[extract-org-chart-actors] upload Anthropic:', upRes.status, errText.slice(0, 300))
      return jsonResponse({ error: 'Echec upload Anthropic' }, 502)
    }
    const upData = await upRes.json()
    const fileId = upData.id as string

    // 2. Appel Claude avec prompt structure
    const startedAt = Date.now()
    const claudeRes = await fetch(`${ANTHROPIC_API}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': ANTHROPIC_BETA,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              { type: isPdf ? 'document' : 'image', source: { type: 'file', file_id: fileId } },
              { type: 'text', text: buildPrompt() },
            ],
          },
          { role: 'assistant', content: '{"actors":[' },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[extract-org-chart-actors] Claude error:', claudeRes.status, errText.slice(0, 500))
      void logAiCall({
        admin, function_name: 'extract-org-chart-actors', model: MODEL,
        input_tokens: null, output_tokens: null, success: false,
        error_message: `${claudeRes.status}`, duration_ms: Date.now() - startedAt,
        organization_id: null, mission_id: missionId, user_id: caller.id,
      })
      await cleanupFile(anthropicKey, fileId)
      return jsonResponse({ error: `Erreur Claude (${claudeRes.status})` }, 502)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    const fullJson = '{"actors":[' + rawText

    void logAiCall({
      admin, function_name: 'extract-org-chart-actors', model: MODEL,
      input_tokens: claudeData.usage?.input_tokens ?? null,
      output_tokens: claudeData.usage?.output_tokens ?? null,
      success: true, duration_ms: Date.now() - startedAt,
      organization_id: null, mission_id: missionId, user_id: caller.id,
    })

    // 3. Cleanup Anthropic file
    await cleanupFile(anthropicKey, fileId)

    // 4. Parse + validate
    let parsed: { actors: unknown[] }
    try {
      parsed = JSON.parse(fullJson) as { actors: unknown[] }
    } catch {
      const match = fullJson.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) as { actors: unknown[] } } catch {
          return jsonResponse({ error: 'Reponse IA non parsable. Reessayez avec une image plus nette.' }, 502)
        }
      } else {
        return jsonResponse({ error: 'Reponse IA non parsable.' }, 502)
      }
    }

    if (!parsed?.actors || !Array.isArray(parsed.actors)) {
      return jsonResponse({ error: 'Reponse IA mal formee' }, 502)
    }

    // 5. Validation stricte des items
    const seen = new Set<string>()
    const cleaned: ExtractedActor[] = []
    for (const item of parsed.actors) {
      if (cleaned.length >= MAX_SUGGESTIONS) break
      if (typeof item !== 'object' || item === null) continue
      const it = item as Record<string, unknown>
      const name = typeof it.name === 'string' ? it.name.trim().slice(0, 200) : ''
      if (name.length === 0) continue
      const dedupKey = name.toLowerCase()
      if (seen.has(dedupKey)) continue
      seen.add(dedupKey)
      cleaned.push({
        name,
        job_title: cleanField(it.job_title, 200),
        department: cleanField(it.department, 200),
        email: cleanEmail(it.email),
        phone: cleanField(it.phone, 50),
      })
    }

    return jsonResponse({
      actors: cleaned,
      tokens: {
        input: claudeData.usage?.input_tokens ?? 0,
        output: claudeData.usage?.output_tokens ?? 0,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[extract-org-chart-actors] error:', message)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})

function cleanField(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (t.length === 0) return null
  return t.slice(0, maxLen)
}

function cleanEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().toLowerCase()
  // Validation basique : doit ressembler a un email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null
  return t.slice(0, 200)
}

function buildPrompt(): string {
  return `Tu es un assistant specialise dans l'extraction d'informations a partir d'organigrammes.

Ta tache : extraire les ACTEURS lies au systeme d'information (SI) depuis l'organigramme fourni.

CIBLE PRIORITAIRE
- RSSI / CISO / Responsable securite SI
- DSI / DPI / Directeur des Systemes d'Information
- DPO / DPD / Delegue a la protection des donnees
- Responsables d'infrastructure, reseau, exploitation, helpdesk
- Responsables de la sensibilisation / formation
- AQSSI, ASSI (PSSI-ES Senegal)
- Responsables fournisseurs / achats SI
- Responsables RH (pour la partie sensibilisation et habilitations)
- Responsables continuite d'activite / PCA
- Direction generale (DG, SG) si elle figure visiblement
- Tout poste avec mention explicite de "securite", "informatique", "numerique"

NE PAS EXTRAIRE
- Personnel technique sans titre identifie (ex: simples developpeurs, agents)
- Stagiaires
- Postes administratifs sans lien SI (ex: comptabilite, accueil, juridique)

CONSIGNES
1. Pour chaque acteur, fournis : name (obligatoire), job_title (fonction), department (direction/service), email et phone si visibles dans l'organigramme.
2. Si une information n'est pas presente, mets null. Ne jamais inventer.
3. Maximum ${MAX_SUGGESTIONS} acteurs. Si l'organigramme est plus large, garde les plus pertinents pour un audit SI.
4. Le name doit etre tel qu'il apparait (prenom + nom).
5. Reponds UNIQUEMENT en JSON strict, sans texte avant ni apres. Le JSON commence par {"actors":[ et se termine par ]}.

FORMAT
{
  "actors": [
    {
      "name": "Marie Lefebvre",
      "job_title": "RSSI",
      "department": "Direction des Systemes d'Information",
      "email": "marie.lefebvre@entreprise.com",
      "phone": null
    }
  ]
}

Commence directement par le JSON.`
}

async function cleanupFile(apiKey: string, fileId: string): Promise<void> {
  try {
    await fetch(`${ANTHROPIC_API}/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-beta': ANTHROPIC_BETA },
    })
  } catch (err) {
    console.warn('[extract-org-chart-actors] cleanup failed:', err)
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
