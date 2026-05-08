import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-plans
 *
 * Gestion CRUD des plans tarifaires (super-admin uniquement).
 * Actions :
 *   - create        : crée un plan (slug auto-généré, immutable)
 *   - update        : met à jour les attributs modifiables (name, description, prix, tier, limites, default)
 *   - delete        : supprime un plan (bloqué si ≥1 organisation l'utilise — RESTRICT FK)
 *   - set_features  : remplace la liste des feature_flags inclus dans un plan
 *
 * Toutes les actions sont gardées par requirePlatformOwner et tracées dans admin_audit_log
 * avec un motif obligatoire.
 */

interface CreateBody {
  action: 'create'
  reason: string
  name: string
  description: string | null
  monthly_price_eur: number
  tier: 'free' | 'standard' | 'enterprise' | 'custom'
  max_users: number | null
  max_missions: number | null
  is_default: boolean
}

interface UpdateBody {
  action: 'update'
  reason: string
  plan_id: string
  name?: string
  description?: string | null
  monthly_price_eur?: number
  tier?: 'free' | 'standard' | 'enterprise' | 'custom'
  max_users?: number | null
  max_missions?: number | null
  is_default?: boolean
}

interface DeleteBody {
  action: 'delete'
  reason: string
  plan_id: string
}

interface SetFeaturesBody {
  action: 'set_features'
  reason: string
  plan_id: string
  flag_ids: string[]
}

type Body = CreateBody | UpdateBody | DeleteBody | SetFeaturesBody

const ALLOWED_TIERS = ['free', 'standard', 'enterprise', 'custom'] as const

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

    if (body.action === 'create') return await handleCreate(admin, owner.id, body)
    if (body.action === 'update') return await handleUpdate(admin, owner.id, body)
    if (body.action === 'delete') return await handleDelete(admin, owner.id, body)
    if (body.action === 'set_features') return await handleSetFeatures(admin, owner.id, body)

    return jsonResponse({ error: `Action inconnue: ${(body as { action: string }).action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-plans] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

// deno-lint-ignore no-explicit-any
async function handleCreate(admin: any, actorId: string, body: CreateBody): Promise<Response> {
  if (!body.name?.trim()) return jsonResponse({ error: 'name requis' }, 400)
  if (typeof body.monthly_price_eur !== 'number' || body.monthly_price_eur < 0) {
    return jsonResponse({ error: 'monthly_price_eur invalide' }, 400)
  }
  if (!ALLOWED_TIERS.includes(body.tier)) return jsonResponse({ error: 'tier invalide' }, 400)

  const slug = generateSlug(body.name)
  if (!slug) return jsonResponse({ error: 'Impossible de générer un slug à partir du nom' }, 400)

  const { data: existing } = await admin.from('plans').select('id').eq('slug', slug).maybeSingle()
  if (existing) return jsonResponse({ error: `Un plan avec le slug "${slug}" existe déjà` }, 409)

  if (body.is_default) await unsetDefaultPlans(admin)

  const { data, error } = await admin.from('plans').insert({
    slug,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    monthly_price_eur: body.monthly_price_eur,
    tier: body.tier,
    max_users: body.max_users,
    max_missions: body.max_missions,
    is_default: body.is_default,
  }).select('id').single()

  if (error || !data) {
    console.error('[admin-plans] create error:', error?.message)
    return jsonResponse({ error: 'Création impossible' }, 500)
  }

  const planId = (data as { id: string }).id
  await logAdminAction(admin, actorId, 'create_plan', 'plan', planId, body.reason, {
    slug, name: body.name, tier: body.tier, monthly_price_eur: body.monthly_price_eur,
  })
  return jsonResponse({ success: true, plan_id: planId })
}

// deno-lint-ignore no-explicit-any
async function handleUpdate(admin: any, actorId: string, body: UpdateBody): Promise<Response> {
  if (!body.plan_id) return jsonResponse({ error: 'plan_id requis' }, 400)

  const { data: current, error: loadErr } = await admin
    .from('plans')
    .select('id, slug, name, is_default')
    .eq('id', body.plan_id).single()
  if (loadErr || !current) return jsonResponse({ error: 'Plan introuvable' }, 404)

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) update.name = body.name.trim()
  if (body.description !== undefined) update.description = body.description?.trim() || null
  if (body.monthly_price_eur !== undefined) {
    if (body.monthly_price_eur < 0) return jsonResponse({ error: 'monthly_price_eur invalide' }, 400)
    update.monthly_price_eur = body.monthly_price_eur
  }
  if (body.tier !== undefined) {
    if (!ALLOWED_TIERS.includes(body.tier)) return jsonResponse({ error: 'tier invalide' }, 400)
    update.tier = body.tier
  }
  if (body.max_users !== undefined) update.max_users = body.max_users
  if (body.max_missions !== undefined) update.max_missions = body.max_missions
  if (body.is_default !== undefined) update.is_default = body.is_default

  if (body.is_default === true) await unsetDefaultPlans(admin, body.plan_id)

  const { error } = await admin.from('plans').update(update).eq('id', body.plan_id)
  if (error) {
    console.error('[admin-plans] update error:', error.message)
    return jsonResponse({ error: 'Modification impossible' }, 500)
  }

  await logAdminAction(admin, actorId, 'update_plan', 'plan', body.plan_id, body.reason, { changes: update })
  return jsonResponse({ success: true })
}

// deno-lint-ignore no-explicit-any
async function handleDelete(admin: any, actorId: string, body: DeleteBody): Promise<Response> {
  if (!body.plan_id) return jsonResponse({ error: 'plan_id requis' }, 400)

  const { data: plan } = await admin.from('plans').select('id, slug, name').eq('id', body.plan_id).maybeSingle()
  if (!plan) return jsonResponse({ error: 'Plan introuvable' }, 404)

  const { count } = await admin
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', body.plan_id)
  if ((count ?? 0) > 0) {
    return jsonResponse({ error: `Suppression bloquée: ${count} organisation(s) utilisent ce plan` }, 409)
  }

  const { error } = await admin.from('plans').delete().eq('id', body.plan_id)
  if (error) {
    console.error('[admin-plans] delete error:', error.message)
    return jsonResponse({ error: 'Suppression impossible' }, 500)
  }

  const p = plan as { slug: string; name: string }
  await logAdminAction(admin, actorId, 'delete_plan', 'plan', body.plan_id, body.reason, { slug: p.slug, name: p.name })
  return jsonResponse({ success: true })
}

// deno-lint-ignore no-explicit-any
async function handleSetFeatures(admin: any, actorId: string, body: SetFeaturesBody): Promise<Response> {
  if (!body.plan_id) return jsonResponse({ error: 'plan_id requis' }, 400)
  if (!Array.isArray(body.flag_ids)) return jsonResponse({ error: 'flag_ids doit être un tableau' }, 400)

  const { data: plan } = await admin.from('plans').select('id').eq('id', body.plan_id).maybeSingle()
  if (!plan) return jsonResponse({ error: 'Plan introuvable' }, 404)

  const { error: delErr } = await admin.from('plan_features').delete().eq('plan_id', body.plan_id)
  if (delErr) {
    console.error('[admin-plans] set_features delete error:', delErr.message)
    return jsonResponse({ error: 'Mise à jour impossible' }, 500)
  }

  if (body.flag_ids.length > 0) {
    const rows = body.flag_ids.map((flag_id) => ({ plan_id: body.plan_id, flag_id }))
    const { error: insErr } = await admin.from('plan_features').insert(rows)
    if (insErr) {
      console.error('[admin-plans] set_features insert error:', insErr.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }
  }

  await logAdminAction(admin, actorId, 'set_plan_features', 'plan', body.plan_id, body.reason, {
    feature_count: body.flag_ids.length,
  })
  return jsonResponse({ success: true })
}

// deno-lint-ignore no-explicit-any
async function unsetDefaultPlans(admin: any, exceptPlanId?: string): Promise<void> {
  let q = admin.from('plans').update({ is_default: false }).eq('is_default', true)
  if (exceptPlanId) q = q.neq('id', exceptPlanId)
  const { error } = await q
  if (error) console.error('[admin-plans] unsetDefaultPlans error:', error.message)
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
