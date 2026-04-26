import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner } from '../_shared/auth-platform-owner.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

/**
 * Edge Function : admin-framework-ai-draft
 *
 * Étape "génération IA" du wizard de création de référentiel.
 * Reçoit en multipart/form-data :
 *  - field "brief" : JSON { name, slug, version, publisher, category, instructions }
 *  - 0 à 5 fichiers PDFs joints (≤ 32 Mo chacun)
 *
 * Pipeline :
 *  1. Vérifie auth platform_owner
 *  2. Upload chaque PDF vers Anthropic Files API → récupère file_ids
 *  3. Appelle Claude Sonnet 4 avec les file references + brief + schema JSON strict
 *  4. Parse le JSON retourné
 *  5. Logue l'appel dans ai_calls_log + supprime les fichiers Anthropic après usage
 *  6. Renvoie le draft au client (pas de persistance — c'est un brouillon)
 *
 * Sécurité :
 *  - Aucun contenu utilisateur stocké en DB (juste métadonnées dans ai_calls_log)
 *  - Limites : 5 fichiers, 32 Mo / fichier, 200 Mo total
 *  - Brief tronqué à 4000 caractères
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const ANTHROPIC_BETA = 'files-api-2025-04-14,context-1m-2025-08-07'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_FILES = 5
const MAX_FILE_SIZE = 32 * 1024 * 1024
const MAX_BRIEF_LENGTH = 4000

interface Brief {
  name: string
  slug: string
  version?: string
  publisher?: string
  category?: string
  instructions?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { admin, owner } = guard

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
  if (!anthropicKey) return jsonResponse({ error: 'Clé API Anthropic non configurée' }, 500)

  try {
    const formData = await req.formData()
    const briefRaw = formData.get('brief')
    if (typeof briefRaw !== 'string') return jsonResponse({ error: 'brief requis' }, 400)
    let brief: Brief
    try { brief = JSON.parse(briefRaw) } catch { return jsonResponse({ error: 'brief JSON invalide' }, 400) }

    if (!brief.name?.trim() || !brief.slug?.trim()) {
      return jsonResponse({ error: 'name et slug requis dans le brief' }, 400)
    }
    if ((brief.instructions?.length ?? 0) > MAX_BRIEF_LENGTH) {
      return jsonResponse({ error: `Instructions trop longues (max ${MAX_BRIEF_LENGTH} caractères)` }, 400)
    }

    // Collecter les fichiers
    const files: File[] = []
    for (const [key, val] of formData.entries()) {
      if (key === 'brief') continue
      if (val instanceof File) files.push(val)
    }
    if (files.length > MAX_FILES) return jsonResponse({ error: `Maximum ${MAX_FILES} fichiers` }, 400)
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) return jsonResponse({ error: `${f.name} dépasse 32 Mo` }, 400)
    }

    // Upload chaque fichier vers Anthropic Files API
    const fileIds: string[] = []
    for (const f of files) {
      const fd = new FormData()
      fd.append('file', f, f.name)
      const upRes = await fetch(`${ANTHROPIC_API}/files`, {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-beta': ANTHROPIC_BETA },
        body: fd,
      })
      if (!upRes.ok) {
        const errText = await upRes.text()
        console.error(`[admin-framework-ai-draft] Anthropic upload ${f.name}:`, upRes.status, errText.slice(0, 300))
        return jsonResponse({ error: `Upload Anthropic Files API échoué pour ${f.name}` }, 502)
      }
      const upData = await upRes.json()
      fileIds.push(upData.id as string)
    }

    // Construire le prompt
    // deno-lint-ignore no-explicit-any
    const content: any[] = []
    for (const fid of fileIds) {
      content.push({ type: 'document', source: { type: 'file', file_id: fid } })
    }
    content.push({ type: 'text', text: buildPrompt(brief) })

    const startedAt = Date.now()
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
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          messages: [
            { role: 'user', content },
            { role: 'assistant', content: '{"domains":[' },
          ],
        }),
      })
    } catch (err) {
      void logAiCall({ admin, function_name: 'admin-framework-ai-draft', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: 'fetch error', duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })
      await cleanupFiles(anthropicKey, fileIds)
      const message = err instanceof Error ? err.message : 'fetch error'
      return jsonResponse({ error: `Appel Claude échoué: ${message}` }, 502)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[admin-framework-ai-draft] Claude error:', claudeRes.status, errText.slice(0, 500))
      void logAiCall({ admin, function_name: 'admin-framework-ai-draft', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}`, duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })
      await cleanupFiles(anthropicKey, fileIds)
      return jsonResponse({ error: `Erreur Claude (${claudeRes.status})` }, 502)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    const fullJson = '{"domains":[' + rawText
    void logAiCall({ admin, function_name: 'admin-framework-ai-draft', model: MODEL, input_tokens: claudeData.usage?.input_tokens ?? null, output_tokens: claudeData.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })

    // Parser le JSON
    let parsed: { domains: DraftDomain[] }
    try {
      parsed = JSON.parse(fullJson) as { domains: DraftDomain[] }
    } catch {
      // Fallback : extraire le bloc JSON via regex
      const match = fullJson.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) as { domains: DraftDomain[] } } catch {
          await cleanupFiles(anthropicKey, fileIds)
          return jsonResponse({ error: 'Réponse IA non parsable. Réessayez avec des instructions plus précises.' }, 502)
        }
      } else {
        await cleanupFiles(anthropicKey, fileIds)
        return jsonResponse({ error: 'Réponse IA non parsable.' }, 502)
      }
    }

    if (!parsed?.domains || !Array.isArray(parsed.domains)) {
      await cleanupFiles(anthropicKey, fileIds)
      return jsonResponse({ error: 'Réponse IA mal formée (domains manquant)' }, 502)
    }

    // Cleanup des fichiers Anthropic (économie de stockage)
    await cleanupFiles(anthropicKey, fileIds)

    return jsonResponse({
      draft: {
        name: brief.name,
        slug: brief.slug,
        version: brief.version ?? null,
        publisher: brief.publisher ?? null,
        category: brief.category ?? 'conformite',
        domains: parsed.domains,
      },
      tokens: { input: claudeData.usage?.input_tokens ?? 0, output: claudeData.usage?.output_tokens ?? 0 },
      files_processed: files.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-framework-ai-draft] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

interface DraftControl { code: string; name: string; description?: string; guidance?: string }
interface DraftDomain { code: string; name: string; description?: string; controls: DraftControl[] }

function buildPrompt(brief: Brief): string {
  const instructions = brief.instructions?.trim() || '(aucune instruction spécifique)'
  return `Tu es un expert en référentiels de conformité et d'audit SI.

Ta tâche : produire la structure d'un référentiel à partir des documents fournis.

CONTEXTE
Nom du référentiel : ${brief.name}
Catégorie : ${brief.category ?? 'conformite'}
${brief.version ? `Version : ${brief.version}\n` : ''}${brief.publisher ? `Éditeur : ${brief.publisher}\n` : ''}
INSTRUCTIONS DU SUPER-ADMIN
${instructions}

CONSIGNES
1. Extrais les domaines (chapitres / sections) et les contrôles présents dans les PDFs joints.
2. Si aucun PDF n'est joint, génère une structure plausible et réaliste cohérente avec le nom et les instructions.
3. Pour chaque contrôle, fournis : code (ex: A.5.1), nom court, description claire en français, et guidance (conseils de mise en œuvre).
4. Reste fidèle aux documents : ne pas inventer de codes qui n'existent pas dans la source.
5. Maximum 30 domaines, 200 contrôles au total. Si le référentiel est plus large, garde les plus essentiels et signale-le dans la description.

FORMAT DE RÉPONSE (JSON STRICT, en français)
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après. Le JSON commence par {"domains":[ et se termine par ]}.

Schema attendu :
{
  "domains": [
    {
      "code": "A.5",
      "name": "Politiques de sécurité de l'information",
      "description": "Description courte du domaine.",
      "controls": [
        {
          "code": "A.5.1",
          "name": "Politique de sécurité",
          "description": "Description du contrôle.",
          "guidance": "Conseils de mise en œuvre."
        }
      ]
    }
  ]
}

Commence directement par le JSON.`
}

async function cleanupFiles(apiKey: string, fileIds: string[]): Promise<void> {
  for (const fid of fileIds) {
    try {
      await fetch(`${ANTHROPIC_API}/files/${fid}`, {
        method: 'DELETE',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-beta': ANTHROPIC_BETA },
      })
    } catch (err) {
      console.warn(`[admin-framework-ai-draft] cleanup failed for ${fid}:`, err)
    }
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
