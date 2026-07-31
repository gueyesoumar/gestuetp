import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner } from '../_shared/auth-platform-owner.ts'
import { logAiCall } from '../_shared/log-ai-call.ts'

/**
 * Edge Function : classify-controls
 *
 * Classe automatiquement les contrôles NON classés d'un référentiel vers une
 * dimension du score de confiance (Phase A du mapping). Utilisé pour les
 * référentiels importés/manuels et pour le backfill des référentiels existants.
 * Les référentiels créés par IA sont déjà classés à la génération ; l'héritage
 * par crosswalk (trigger 00159) couvre les contrôles mappés.
 *
 * Body JSON : { framework_id: string }
 * Sécurité : platform_owner uniquement ; clé Anthropic côté serveur ; ne
 * réécrit jamais une dimension déjà posée (filtre `dimension is null`).
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_CONTROLS = 200

const DIMENSIONS = [
  'security', 'data_protection', 'resilience', 'integrity',
  'governance', 'verifiability', 'human_factor', 'third_party',
] as const

interface ControlRow {
  id: string
  code: string
  name: string
  description: string | null
}

function buildPrompt(controls: ControlRow[]): string {
  const list = controls
    .map((c) => `${c.code} | ${c.name}${c.description ? ' — ' + c.description.slice(0, 160) : ''}`)
    .join('\n')
  return `Tu classes des contrôles de conformité SI dans UNE dimension du score de confiance.

Dimensions disponibles (renvoie exactement l'une de ces valeurs) :
- security : protection technique/physique, accès, identité, cryptographie, réseau, malware, vulnérabilités
- data_protection : vie privée, données personnelles, classification, masquage, DLP, souveraineté
- resilience : incidents, continuité, PCA/PRA, sauvegarde, redondance, disponibilité
- integrity : intégrité des données/traitements, développement sécurisé, gestion des changements, IA responsable
- governance : politiques, rôles & responsabilités, redevabilité, conformité, exigences légales, éthique
- verifiability : journalisation, collecte de preuves, protection des enregistrements, auditabilité
- human_factor : sensibilisation, formation, RH, screening, culture
- third_party : fournisseurs, sous-traitants, chaîne d'approvisionnement, cloud, tiers

CONTRÔLES (un par ligne : code | nom — description) :
${list}

Réponds UNIQUEMENT avec un tableau JSON, sans texte autour, de la forme :
[{"code":"A.5.1","dimension":"governance"}, ...]
Un objet par contrôle, "dimension" strictement dans la liste ci-dessus. Commence par [`
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { admin, owner } = guard

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('ANTHROPIC_KEY')
  if (!anthropicKey) return jsonResponse({ error: 'Clé API Anthropic non configurée' }, 500)

  try {
    const body = await req.json().catch(() => ({}))
    const frameworkId = String(body.framework_id ?? '')
    if (!frameworkId) return jsonResponse({ error: 'framework_id requis' }, 400)

    const { data: domains, error: dErr } = await admin.from('domains').select('id').eq('framework_id', frameworkId)
    if (dErr) return jsonResponse({ error: 'Lecture des domaines impossible' }, 500)
    const domainIds = (domains ?? []).map((d: { id: string }) => d.id)
    if (domainIds.length === 0) return jsonResponse({ classified: 0, remaining: 0, total_unmapped: 0 })

    const { data: rows, error: cErr } = await admin.from('controls')
      .select('id, code, name, description')
      .in('domain_id', domainIds)
      .is('dimension', null)
      .order('code', { ascending: true })
    if (cErr) return jsonResponse({ error: 'Lecture des contrôles impossible' }, 500)

    const unmapped = (rows ?? []) as ControlRow[]
    if (unmapped.length === 0) return jsonResponse({ classified: 0, remaining: 0, total_unmapped: 0 })

    const batch = unmapped.slice(0, MAX_CONTROLS)
    const remaining = unmapped.length - batch.length
    console.log(`[classify-controls] framework=${frameworkId} unmapped=${unmapped.length} batch=${batch.length} → appel Claude`)

    const startedAt = Date.now()
    let claudeRes: Response
    try {
      claudeRes = await fetch(`${ANTHROPIC_API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8000,
          messages: [
            { role: 'user', content: buildPrompt(batch) },
            { role: 'assistant', content: '[' },
          ],
        }),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'fetch error'
      console.error('[classify-controls] fetch Claude échoué:', message)
      void logAiCall({ admin, function_name: 'classify-controls', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: 'fetch error', duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })
      return jsonResponse({ error: `Appel Claude échoué: ${message}` }, 502)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[classify-controls] Claude', claudeRes.status, errText.slice(0, 500))
      void logAiCall({ admin, function_name: 'classify-controls', model: MODEL, input_tokens: null, output_tokens: null, success: false, error_message: `${claudeRes.status}`, duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })
      return jsonResponse({ error: `Erreur Claude (${claudeRes.status}): ${errText.slice(0, 180)}` }, 502)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    void logAiCall({ admin, function_name: 'classify-controls', model: MODEL, input_tokens: claudeData.usage?.input_tokens ?? null, output_tokens: claudeData.usage?.output_tokens ?? null, success: true, duration_ms: Date.now() - startedAt, organization_id: null, mission_id: null, user_id: owner.id })

    let parsed: Array<{ code: string; dimension: string }>
    try {
      parsed = JSON.parse('[' + rawText) as Array<{ code: string; dimension: string }>
    } catch {
      const match = ('[' + rawText).match(/\[[\s\S]*\]/)
      if (!match) { console.error('[classify-controls] parse: pas de tableau JSON'); return jsonResponse({ error: 'Réponse IA non parsable.' }, 502) }
      try { parsed = JSON.parse(match[0]) } catch { console.error('[classify-controls] parse: JSON invalide'); return jsonResponse({ error: 'Réponse IA non parsable.' }, 502) }
    }

    // code -> id (uniquement les contrôles du batch, non classés)
    const idByCode = new Map<string, string>()
    for (const c of batch) idByCode.set(c.code, c.id)

    // Regrouper par dimension pour des updates .in() efficaces
    const idsByDim = new Map<string, string[]>()
    for (const item of parsed) {
      const dim = item?.dimension
      const id = idByCode.get(item?.code)
      if (!id || !(DIMENSIONS as readonly string[]).includes(dim)) continue
      idsByDim.set(dim, [...(idsByDim.get(dim) ?? []), id])
    }

    let classified = 0
    for (const [dim, ids] of idsByDim) {
      const { error: uErr, count } = await admin.from('controls')
        .update({ dimension: dim, dimension_source: 'ai' }, { count: 'exact' })
        .in('id', ids)
        .is('dimension', null) // ne jamais écraser un classement existant
      if (uErr) { console.error('[classify-controls] update:', uErr.message); continue }
      classified += count ?? ids.length
    }

    console.log(`[classify-controls] terminé: classified=${classified} remaining=${remaining}`)
    return jsonResponse({ classified, remaining, total_unmapped: unmapped.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[classify-controls] error:', message)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})
