// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * admin-entitlement — écriture fine des entitlements (RFC 0008 / INC 5a).
 * Réservé au super-admin. Écrit directement org_entitlements (service_role), pour
 * les attributs du nouveau modèle que admin-subscription ne sait pas exprimer, et
 * pour octroyer des droits MANUELS (source='manual', ex. ai_credits).
 *
 * Coexiste avec le pont (non-destructif depuis 00245) : le pont préserve les
 * colonnes admin et ne touche jamais les lignes source='manual'.
 *
 * Actions : set_attributes | grant_manual | remove_manual | set_status | apply_template
 */

const PRICING_KINDS = new Set(['none', 'flat', 'per_unit', 'metered'])
const PRICE_UNITS = new Set(['month', 'year', 'seat', 'mission', 'assujetti', 'client', 'subsidiary', 'credit'])
const ENFORCEMENTS = new Set(['soft', 'hard'])
const STATUSES = new Set(['active', 'trial', 'suspended'])

interface Body {
  action: 'set_attributes' | 'grant_manual' | 'remove_manual' | 'set_status' | 'apply_template'
  organization_id: string
  key?: string
  plan_slug?: string
  reason: string
  pricing_kind?: string
  price_amount?: number | null
  price_unit?: string | null
  included_qty?: number | null
  discount_pct?: number
  enforcement?: string
  limit_value?: number | null
  capability?: string | null
  status?: string
  trial_ends_at?: string | null
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard
  const db = admin as any

  try {
    const body = await req.json() as Body
    const org = body.organization_id?.trim()
    const key = body.key?.trim()
    if (!org || !body.reason?.trim()) return json({ error: 'organization_id et reason requis' }, 400)
    if (body.action !== 'apply_template' && !key) return json({ error: 'key requis' }, 400)

    const { data: target } = await db.from('organizations').select('id, name').eq('id', org).single()
    if (!target) return json({ error: 'Organisation introuvable' }, 404)

    const refresh = () => db.rpc('refresh_org_capabilities', { p_org: org })
    const log = (meta: Record<string, unknown>) =>
      logAdminAction(admin, owner.id, `entitlement.${body.action}`, 'organization', org, body.reason, { organization_name: target.name, key: key ?? null, ...meta })

    if (body.action === 'apply_template') {
      const plan = body.plan_slug?.trim()
      if (!plan) return json({ error: 'plan_slug requis' }, 400)
      const { error } = await db.rpc('apply_entitlement_template', { p_org: org, p_plan: plan })
      if (error) { console.error('[admin-entitlement] apply_template:', error.message); return json({ error: 'Application du template impossible' }, 500) }
      await log({ plan_slug: plan })
      return json({ ok: true })
    }

    if (body.action === 'set_attributes') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.pricing_kind !== undefined) {
        if (!PRICING_KINDS.has(body.pricing_kind)) return json({ error: 'pricing_kind invalide' }, 400)
        patch.pricing_kind = body.pricing_kind
      }
      if (body.price_unit !== undefined) {
        if (body.price_unit !== null && !PRICE_UNITS.has(body.price_unit)) return json({ error: 'price_unit invalide' }, 400)
        patch.price_unit = body.price_unit
      }
      if (body.enforcement !== undefined) {
        if (!ENFORCEMENTS.has(body.enforcement)) return json({ error: 'enforcement invalide' }, 400)
        patch.enforcement = body.enforcement
      }
      if (body.price_amount !== undefined) patch.price_amount = body.price_amount
      if (body.included_qty !== undefined) patch.included_qty = body.included_qty
      if (body.limit_value !== undefined) patch.limit_value = body.limit_value
      if (body.discount_pct !== undefined) {
        if (body.discount_pct < 0 || body.discount_pct > 100) return json({ error: 'discount_pct hors bornes' }, 400)
        patch.discount_pct = body.discount_pct
      }
      const { data: updated, error } = await db.from('org_entitlements').update(patch).eq('organization_id', org).eq('key', key).select('id').single()
      if (error || !updated) return json({ error: 'Entitlement introuvable pour cette organisation' }, 404)
      await log({ patch })
      return json({ ok: true })
    }

    if (body.action === 'set_status') {
      if (!body.status || !STATUSES.has(body.status)) return json({ error: 'status invalide' }, 400)
      const patch: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() }
      patch.trial_ends_at = body.status === 'trial' ? (body.trial_ends_at ?? null) : null
      if (body.status === 'suspended') patch.suspended_at = new Date().toISOString()
      const { data: updated, error } = await db.from('org_entitlements').update(patch).eq('organization_id', org).eq('key', key).select('id').single()
      if (error || !updated) return json({ error: 'Entitlement introuvable pour cette organisation' }, 404)
      await refresh()
      await log({ status: body.status })
      return json({ ok: true })
    }

    if (body.action === 'grant_manual') {
      if (body.pricing_kind && !PRICING_KINDS.has(body.pricing_kind)) return json({ error: 'pricing_kind invalide' }, 400)
      if (body.enforcement && !ENFORCEMENTS.has(body.enforcement)) return json({ error: 'enforcement invalide' }, 400)
      if (body.status && !STATUSES.has(body.status)) return json({ error: 'status invalide' }, 400)
      const row = {
        organization_id: org,
        key,
        status: body.status ?? 'active',
        trial_ends_at: body.status === 'trial' ? (body.trial_ends_at ?? null) : null,
        limit_value: body.limit_value ?? null,
        pricing_kind: body.pricing_kind ?? 'none',
        price_amount: body.price_amount ?? null,
        price_unit: body.price_unit ?? null,
        included_qty: body.included_qty ?? null,
        discount_pct: body.discount_pct ?? 0,
        enforcement: body.enforcement ?? 'soft',
        source: 'manual',
        capability: body.capability ?? null,
        granted_by: owner.id,
        updated_at: new Date().toISOString(),
      }
      const { error } = await db.from('org_entitlements').upsert(row, { onConflict: 'organization_id,key' })
      if (error) { console.error('[admin-entitlement] grant_manual:', error.message); return json({ error: 'Octroi impossible' }, 500) }
      await refresh()
      await log({ granted: row.key, capability: row.capability })
      return json({ ok: true })
    }

    if (body.action === 'remove_manual') {
      const { data: removed, error } = await db.from('org_entitlements').delete()
        .eq('organization_id', org).eq('key', key).eq('source', 'manual').select('id')
      if (error) { console.error('[admin-entitlement] remove_manual:', error.message); return json({ error: 'Retrait impossible' }, 500) }
      if (!removed || removed.length === 0) return json({ error: 'Aucun droit manuel à retirer pour cette clé' }, 404)
      await refresh()
      await log({ removed: key })
      return json({ ok: true })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('[admin-entitlement]', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
