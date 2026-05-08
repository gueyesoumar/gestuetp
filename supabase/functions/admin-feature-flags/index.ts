import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-feature-flags
 *
 * Gestion CRUD du catalogue feature_flags + toggle kill switch global.
 * Lecture publique via RLS read-all ; écriture exclusivement ici pour
 * garantir audit log + motif obligatoire.
 *
 * Actions :
 *   - toggle  : ON/OFF du kill switch global
 *   - create  : nouvelle entrée du catalogue (slug auto, immutable)
 *   - update  : édition metadata (name, description, category, maturity, icon_name)
 *   - delete  : suppression avec garde-fou (refuse si plan_features ou overrides existent)
 */

interface ToggleBody { action: 'toggle'; slug: string; enabled: boolean; reason: string }
interface CreateBody {
  action: 'create'
  reason: string
  name: string
  description: string | null
  category: 'ai' | 'reporting' | 'branding' | 'security' | 'collab' | 'general'
  maturity: 'stable' | 'beta' | 'new'
  icon_name: string | null
  is_globally_enabled?: boolean
}
interface UpdateBody {
  action: 'update'
  reason: string
  flag_id: string
  name?: string
  description?: string | null
  category?: 'ai' | 'reporting' | 'branding' | 'security' | 'collab' | 'general'
  maturity?: 'stable' | 'beta' | 'new'
  icon_name?: string | null
}
interface DeleteBody { action: 'delete'; reason: string; flag_id: string }
type Body = ToggleBody | CreateBody | UpdateBody | DeleteBody

const ALLOWED_CATEGORIES = ['ai', 'reporting', 'branding', 'security', 'collab', 'general'] as const
const ALLOWED_MATURITIES = ['stable', 'beta', 'new'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.action || !body.reason?.trim()) {
      return jsonResponse({ error: 'action et reason requis' }, 400)
    }

    if (body.action === 'toggle') return await handleToggle(admin, owner.id, body)
    if (body.action === 'create') return await handleCreate(admin, owner.id, body)
    if (body.action === 'update') return await handleUpdate(admin, owner.id, body)
    if (body.action === 'delete') return await handleDelete(admin, owner.id, body)

    return jsonResponse({ error: `Action inconnue: ${(body as { action: string }).action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-feature-flags] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

// deno-lint-ignore no-explicit-any
async function handleToggle(admin: any, actorId: string, body: ToggleBody): Promise<Response> {
  if (!body.slug || typeof body.enabled !== 'boolean') {
    return jsonResponse({ error: 'slug et enabled requis' }, 400)
  }

  const { data: flag, error: loadError } = await admin
    .from('feature_flags')
    .select('id, slug, name, is_globally_enabled')
    .eq('slug', body.slug).single()
  if (loadError || !flag) return jsonResponse({ error: 'Flag introuvable' }, 404)
  const f = flag as { id: string; slug: string; name: string; is_globally_enabled: boolean }

  if (f.is_globally_enabled === body.enabled) {
    return jsonResponse({ already: true, is_globally_enabled: f.is_globally_enabled })
  }

  const { error: updateError } = await admin.from('feature_flags')
    .update({ is_globally_enabled: body.enabled, updated_by: actorId })
    .eq('id', f.id)
  if (updateError) {
    console.error('[admin-feature-flags] toggle error:', updateError.message)
    return jsonResponse({ error: 'Mise à jour impossible' }, 500)
  }

  await logAdminAction(admin, actorId, body.enabled ? 'enable_feature_flag' : 'disable_feature_flag', 'feature_flag', f.id, body.reason, {
    slug: f.slug, name: f.name, previous: f.is_globally_enabled, new: body.enabled,
  })
  return jsonResponse({ success: true, is_globally_enabled: body.enabled })
}

// deno-lint-ignore no-explicit-any
async function handleCreate(admin: any, actorId: string, body: CreateBody): Promise<Response> {
  if (!body.name?.trim()) return jsonResponse({ error: 'name requis' }, 400)
  if (!ALLOWED_CATEGORIES.includes(body.category)) return jsonResponse({ error: 'category invalide' }, 400)
  if (!ALLOWED_MATURITIES.includes(body.maturity)) return jsonResponse({ error: 'maturity invalide' }, 400)

  const slug = generateSlug(body.name)
  if (!slug) return jsonResponse({ error: 'Impossible de générer un slug à partir du nom' }, 400)

  const { data: existing } = await admin.from('feature_flags').select('id').eq('slug', slug).maybeSingle()
  if (existing) return jsonResponse({ error: `Une fonctionnalité avec le slug "${slug}" existe déjà` }, 409)

  const { data, error } = await admin.from('feature_flags').insert({
    slug,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    category: body.category,
    maturity: body.maturity,
    icon_name: body.icon_name?.trim() || null,
    is_globally_enabled: body.is_globally_enabled ?? false,
    updated_by: actorId,
  }).select('id').single()

  if (error || !data) {
    console.error('[admin-feature-flags] create error:', error?.message)
    return jsonResponse({ error: 'Création impossible' }, 500)
  }

  const flagId = (data as { id: string }).id
  await logAdminAction(admin, actorId, 'create_feature_flag', 'feature_flag', flagId, body.reason, {
    slug, name: body.name, category: body.category, maturity: body.maturity,
  })
  return jsonResponse({ success: true, flag_id: flagId, slug })
}

// deno-lint-ignore no-explicit-any
async function handleUpdate(admin: any, actorId: string, body: UpdateBody): Promise<Response> {
  if (!body.flag_id) return jsonResponse({ error: 'flag_id requis' }, 400)

  const { data: current, error: loadErr } = await admin
    .from('feature_flags')
    .select('id, slug, name')
    .eq('id', body.flag_id).single()
  if (loadErr || !current) return jsonResponse({ error: 'Flag introuvable' }, 404)

  const update: Record<string, unknown> = { updated_by: actorId }
  if (body.name !== undefined) {
    if (!body.name.trim()) return jsonResponse({ error: 'name ne peut pas être vide' }, 400)
    update.name = body.name.trim()
  }
  if (body.description !== undefined) update.description = body.description?.trim() || null
  if (body.category !== undefined) {
    if (!ALLOWED_CATEGORIES.includes(body.category)) return jsonResponse({ error: 'category invalide' }, 400)
    update.category = body.category
  }
  if (body.maturity !== undefined) {
    if (!ALLOWED_MATURITIES.includes(body.maturity)) return jsonResponse({ error: 'maturity invalide' }, 400)
    update.maturity = body.maturity
  }
  if (body.icon_name !== undefined) update.icon_name = body.icon_name?.trim() || null

  const { error } = await admin.from('feature_flags').update(update).eq('id', body.flag_id)
  if (error) {
    console.error('[admin-feature-flags] update error:', error.message)
    return jsonResponse({ error: 'Modification impossible' }, 500)
  }

  await logAdminAction(admin, actorId, 'update_feature_flag', 'feature_flag', body.flag_id, body.reason, { changes: update })
  return jsonResponse({ success: true })
}

// deno-lint-ignore no-explicit-any
async function handleDelete(admin: any, actorId: string, body: DeleteBody): Promise<Response> {
  if (!body.flag_id) return jsonResponse({ error: 'flag_id requis' }, 400)

  const { data: flag } = await admin.from('feature_flags').select('id, slug, name').eq('id', body.flag_id).maybeSingle()
  if (!flag) return jsonResponse({ error: 'Flag introuvable' }, 404)

  // Garde-fou : refuser si la feature est encore référencée ailleurs
  const { count: planCount } = await admin
    .from('plan_features').select('flag_id', { count: 'exact', head: true })
    .eq('flag_id', body.flag_id)
  if ((planCount ?? 0) > 0) {
    return jsonResponse({ error: `Suppression bloquée : cette fonctionnalité est encore incluse dans ${planCount} plan(s). Retirez-la d'abord via la matrice.` }, 409)
  }

  const { count: overrideCount } = await admin
    .from('feature_flag_overrides').select('flag_id', { count: 'exact', head: true })
    .eq('flag_id', body.flag_id)
  if ((overrideCount ?? 0) > 0) {
    return jsonResponse({ error: `Suppression bloquée : cette fonctionnalité a encore ${overrideCount} override(s) cabinet. Réinitialisez-les d'abord.` }, 409)
  }

  const { error } = await admin.from('feature_flags').delete().eq('id', body.flag_id)
  if (error) {
    console.error('[admin-feature-flags] delete error:', error.message)
    return jsonResponse({ error: 'Suppression impossible' }, 500)
  }

  const f = flag as { slug: string; name: string }
  await logAdminAction(admin, actorId, 'delete_feature_flag', 'feature_flag', body.flag_id, body.reason, { slug: f.slug, name: f.name })
  return jsonResponse({ success: true })
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
