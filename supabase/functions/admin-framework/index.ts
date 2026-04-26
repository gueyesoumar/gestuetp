import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-framework
 *
 * CRUD complet sur frameworks / domains / controls. Service-role + requirePlatformOwner.
 * Soft-delete par défaut quand des références existent. Hard-delete uniquement si
 * 0 mission / 0 assessment ne pointent vers l'entité.
 *
 * Actions :
 *  - create_framework / update_framework / delete_framework
 *  - create_domain / update_domain / delete_domain / reorder_domains
 *  - create_control / update_control / delete_control / reorder_controls
 */

// deno-lint-ignore no-explicit-any
type Admin = any

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/
const CODE_RE = /^[A-Za-z0-9._-]{1,50}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as { action: string; [k: string]: unknown }
    const action = body.action

    switch (action) {
      case 'create_framework': return await handleCreateFramework(admin, owner.id, body)
      case 'update_framework': return await handleUpdateFramework(admin, owner.id, body)
      case 'delete_framework': return await handleDeleteFramework(admin, owner.id, body)
      case 'create_domain': return await handleCreateDomain(admin, owner.id, body)
      case 'update_domain': return await handleUpdateDomain(admin, body)
      case 'delete_domain': return await handleDeleteDomain(admin, owner.id, body)
      case 'reorder_domains': return await handleReorderDomains(admin, body)
      case 'create_control': return await handleCreateControl(admin, owner.id, body)
      case 'update_control': return await handleUpdateControl(admin, body)
      case 'delete_control': return await handleDeleteControl(admin, owner.id, body)
      case 'reorder_controls': return await handleReorderControls(admin, body)
      default: return jsonResponse({ error: `Action inconnue: ${action}` }, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-framework] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

// ── FRAMEWORK ─────────────────────────────────────────────────────────────

async function handleCreateFramework(admin: Admin, ownerId: string, body: Record<string, unknown>): Promise<Response> {
  const name = String(body.name ?? '').trim()
  const slug = String(body.slug ?? '').trim()
  const version = body.version ? String(body.version).trim() : null
  const publisher = body.publisher ? String(body.publisher).trim() : null
  const description = body.description ? String(body.description).trim() : null
  const category = String(body.category ?? 'conformite').trim()
  const wasAiGenerated = body.was_ai_generated === true

  if (!name || !slug) return jsonResponse({ error: 'name et slug requis' }, 400)
  if (!SLUG_RE.test(slug)) return jsonResponse({ error: 'Slug invalide (a-z, 0-9, tirets)' }, 400)
  if (name.length > 200) return jsonResponse({ error: 'name trop long (max 200)' }, 400)

  const { data, error } = await admin.from('frameworks')
    .insert({ name, slug, version, publisher, description, category, was_ai_generated: wasAiGenerated, is_active: true })
    .select('id, slug')
    .single()

  if (error) {
    if (error.message.includes('duplicate')) return jsonResponse({ error: 'Slug ou nom déjà utilisé' }, 409)
    console.error('[admin-framework] create_framework:', error.message)
    return jsonResponse({ error: 'Création impossible' }, 500)
  }

  await logAdminAction(admin, ownerId, 'create_framework', 'framework', (data as { id: string }).id, body.reason as string ?? `Création: ${name}`, { name, slug, was_ai_generated: wasAiGenerated })
  return jsonResponse({ framework: data })
}

async function handleUpdateFramework(admin: Admin, ownerId: string, body: Record<string, unknown>): Promise<Response> {
  const id = String(body.id ?? '')
  if (!id) return jsonResponse({ error: 'id requis' }, 400)

  const updates: Record<string, unknown> = {}
  for (const k of ['name', 'description', 'version', 'publisher', 'category']) {
    if (k in body && typeof body[k] === 'string') updates[k] = (body[k] as string).trim()
  }
  if ('is_active' in body && typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if ('was_ai_generated' in body && typeof body.was_ai_generated === 'boolean') updates.was_ai_generated = body.was_ai_generated
  if (typeof updates.name === 'string' && (updates.name as string).length > 200) {
    return jsonResponse({ error: 'name trop long (max 200)' }, 400)
  }
  if (Object.keys(updates).length === 0) return jsonResponse({ error: 'Aucun champ à mettre à jour' }, 400)

  updates.updated_at = new Date().toISOString()
  const { error } = await admin.from('frameworks').update(updates).eq('id', id)
  if (error) {
    console.error('[admin-framework] update_framework:', error.message)
    return jsonResponse({ error: 'Mise à jour impossible' }, 500)
  }

  // Log seulement si soft-delete (is_active toggle)
  if ('is_active' in updates) {
    await logAdminAction(admin, ownerId, updates.is_active ? 'reactivate_framework' : 'deactivate_framework', 'framework', id, body.reason as string ?? '(soft delete)', updates)
  }
  return jsonResponse({ success: true })
}

async function handleDeleteFramework(admin: Admin, ownerId: string, body: Record<string, unknown>): Promise<Response> {
  const id = String(body.id ?? '')
  const reason = String(body.reason ?? '').trim()
  if (!id || !reason) return jsonResponse({ error: 'id et reason requis' }, 400)

  // Refus si une mission utilise ce framework
  const { count: missionCount } = await admin
    .from('missions').select('id', { count: 'exact', head: true }).eq('framework_id', id)
  if ((missionCount ?? 0) > 0) {
    return jsonResponse({
      error: `${missionCount} mission(s) utilise(nt) ce référentiel. Désactivez-le (soft-delete) plutôt que de supprimer.`,
      missions_count: missionCount,
    }, 409)
  }

  const { data: fw } = await admin.from('frameworks').select('name, slug').eq('id', id).single()
  const { error } = await admin.from('frameworks').delete().eq('id', id)
  if (error) {
    console.error('[admin-framework] delete_framework:', error.message)
    return jsonResponse({ error: 'Suppression impossible' }, 500)
  }

  await logAdminAction(admin, ownerId, 'delete_framework', 'framework', id, reason, fw ?? {})
  return jsonResponse({ success: true })
}

// ── DOMAIN ────────────────────────────────────────────────────────────────

async function handleCreateDomain(admin: Admin, _ownerId: string, body: Record<string, unknown>): Promise<Response> {
  const framework_id = String(body.framework_id ?? '')
  const code = String(body.code ?? '').trim()
  const name = String(body.name ?? '').trim()
  const description = body.description ? String(body.description).trim() : null
  if (!framework_id || !code || !name) return jsonResponse({ error: 'framework_id, code et name requis' }, 400)
  if (!CODE_RE.test(code)) return jsonResponse({ error: 'code invalide' }, 400)

  const { data: maxRow } = await admin.from('domains').select('sort_order').eq('framework_id', framework_id).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 10

  const { data, error } = await admin.from('domains')
    .insert({ framework_id, code, name, description, sort_order: nextOrder, is_active: true })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('duplicate')) return jsonResponse({ error: 'Code déjà utilisé pour ce référentiel' }, 409)
    return jsonResponse({ error: 'Création impossible' }, 500)
  }
  return jsonResponse({ domain: data })
}

async function handleUpdateDomain(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const id = String(body.id ?? '')
  if (!id) return jsonResponse({ error: 'id requis' }, 400)
  const updates: Record<string, unknown> = {}
  for (const k of ['code', 'name', 'description']) {
    if (k in body && typeof body[k] === 'string') updates[k] = (body[k] as string).trim()
  }
  if ('is_active' in body && typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (Object.keys(updates).length === 0) return jsonResponse({ error: 'Aucun champ à mettre à jour' }, 400)
  updates.updated_at = new Date().toISOString()
  const { error } = await admin.from('domains').update(updates).eq('id', id)
  if (error) return jsonResponse({ error: 'Mise à jour impossible' }, 500)
  return jsonResponse({ success: true })
}

async function handleDeleteDomain(admin: Admin, ownerId: string, body: Record<string, unknown>): Promise<Response> {
  const id = String(body.id ?? '')
  if (!id) return jsonResponse({ error: 'id requis' }, 400)

  // Vérifier si des assessments référencent un control de ce domaine
  const { count: assessmentCount } = await admin
    .from('control_assessments')
    .select('id', { count: 'exact', head: true })
    .in('control_id', (await admin.from('controls').select('id').eq('domain_id', id)).data?.map((c: { id: string }) => c.id) ?? [])

  if ((assessmentCount ?? 0) > 0) {
    return jsonResponse({
      error: `${assessmentCount} assessment(s) référencent les contrôles de ce domaine. Désactivez-le plutôt.`,
      assessments_count: assessmentCount,
    }, 409)
  }

  const { error } = await admin.from('domains').delete().eq('id', id)
  if (error) return jsonResponse({ error: 'Suppression impossible' }, 500)

  await logAdminAction(admin, ownerId, 'delete_domain', 'domain', id, body.reason as string ?? '(domain delete)', {})
  return jsonResponse({ success: true })
}

async function handleReorderDomains(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const orderedIds = body.ordered_ids as string[] | undefined
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return jsonResponse({ error: 'ordered_ids requis' }, 400)

  for (let i = 0; i < orderedIds.length; i++) {
    await admin.from('domains').update({ sort_order: (i + 1) * 10 }).eq('id', orderedIds[i])
  }
  return jsonResponse({ success: true })
}

// ── CONTROL ───────────────────────────────────────────────────────────────

async function handleCreateControl(admin: Admin, _ownerId: string, body: Record<string, unknown>): Promise<Response> {
  const domain_id = String(body.domain_id ?? '')
  const code = String(body.code ?? '').trim()
  const name = String(body.name ?? '').trim()
  const description = body.description ? String(body.description).trim() : null
  const guidance = body.guidance ? String(body.guidance).trim() : null
  if (!domain_id || !code || !name) return jsonResponse({ error: 'domain_id, code et name requis' }, 400)
  if (!CODE_RE.test(code)) return jsonResponse({ error: 'code invalide' }, 400)

  const { data: maxRow } = await admin.from('controls').select('sort_order').eq('domain_id', domain_id).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 10

  const { data, error } = await admin.from('controls')
    .insert({ domain_id, code, name, description, guidance, sort_order: nextOrder, is_active: true })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('duplicate')) return jsonResponse({ error: 'Code déjà utilisé pour ce domaine' }, 409)
    return jsonResponse({ error: 'Création impossible' }, 500)
  }
  return jsonResponse({ control: data })
}

async function handleUpdateControl(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const id = String(body.id ?? '')
  if (!id) return jsonResponse({ error: 'id requis' }, 400)
  const updates: Record<string, unknown> = {}
  for (const k of ['code', 'name', 'description', 'guidance']) {
    if (k in body && typeof body[k] === 'string') updates[k] = (body[k] as string).trim()
  }
  if ('is_active' in body && typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (Object.keys(updates).length === 0) return jsonResponse({ error: 'Aucun champ à mettre à jour' }, 400)
  updates.updated_at = new Date().toISOString()
  const { error } = await admin.from('controls').update(updates).eq('id', id)
  if (error) return jsonResponse({ error: 'Mise à jour impossible' }, 500)
  return jsonResponse({ success: true })
}

async function handleDeleteControl(admin: Admin, ownerId: string, body: Record<string, unknown>): Promise<Response> {
  const id = String(body.id ?? '')
  if (!id) return jsonResponse({ error: 'id requis' }, 400)

  const { count: assessmentCount } = await admin
    .from('control_assessments').select('id', { count: 'exact', head: true }).eq('control_id', id)
  if ((assessmentCount ?? 0) > 0) {
    return jsonResponse({
      error: `${assessmentCount} assessment(s) référencent ce contrôle. Désactivez-le plutôt.`,
      assessments_count: assessmentCount,
    }, 409)
  }

  const { error } = await admin.from('controls').delete().eq('id', id)
  if (error) return jsonResponse({ error: 'Suppression impossible' }, 500)

  await logAdminAction(admin, ownerId, 'delete_control', 'control', id, body.reason as string ?? '(control delete)', {})
  return jsonResponse({ success: true })
}

async function handleReorderControls(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const orderedIds = body.ordered_ids as string[] | undefined
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return jsonResponse({ error: 'ordered_ids requis' }, 400)

  for (let i = 0; i < orderedIds.length; i++) {
    await admin.from('controls').update({ sort_order: (i + 1) * 10 }).eq('id', orderedIds[i])
  }
  return jsonResponse({ success: true })
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
