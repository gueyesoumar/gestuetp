// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * admin-subscription — gestion des abonnements d'une organisation (RFC 0006, P4a).
 * Réservé au super-admin. Écrit org_subscriptions / org_subscription_features +
 * organizations.discount_pct / home_product, via service_role. Chaque acte est
 * journalisé (activity_log via logAdminAction, action `subscription.*`).
 *
 * DORMANT côté accès : écrire un abonnement n'affecte PAS encore les capacités
 * (le flip capacités-dérivées-des-abonnements = C+P3). C'est le write-path seul.
 *
 * Actions : subscribe | trial | set_status | remove | apply_plan | set_discount |
 *           set_product_discount | toggle_feature | set_home
 */

const STATUSES = new Set(['active', 'trial', 'suspended'])

interface Body {
  action: string
  organization_id: string
  product_key?: string
  feature_key?: string
  plan_slug?: string
  status?: string
  enabled?: boolean
  discount_pct?: number
  trial_days?: number
  reason: string
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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
    if (!org || !body.reason?.trim()) return json({ error: 'organization_id et reason requis' }, 400)

    const { data: target } = await db.from('organizations').select('id, name, home_product').eq('id', org).single()
    if (!target) return json({ error: 'Organisation introuvable' }, 404)

    // Valide un product_key contre le catalogue (produits publiés).
    const requireProduct = async (key?: string) => {
      if (!key) return null
      const { data } = await db.from('products').select('key, monthly_price, is_home_eligible').eq('key', key).single()
      return data as { key: string; monthly_price: number; is_home_eligible: boolean } | null
    }
    const ensureSub = async (productKey: string) => {
      const { data } = await db.from('org_subscriptions').select('id').eq('organization_id', org).eq('product_key', productKey).single()
      return (data as { id: string } | null)?.id ?? null
    }
    const addCoreFeatures = async (subId: string, productKey: string) => {
      const { data: feats } = await db.from('product_features').select('key, monthly_price').eq('product_key', productKey).eq('is_core', true)
      for (const f of (feats ?? []) as Array<{ key: string; monthly_price: number }>) {
        await db.from('org_subscription_features').upsert(
          { subscription_id: subId, feature_key: f.key, unit_price: f.monthly_price },
          { onConflict: 'subscription_id,feature_key' },
        )
      }
    }

    let meta: Record<string, unknown> = {}
    const a = body.action

    if (a === 'subscribe' || a === 'trial') {
      const prod = await requireProduct(body.product_key)
      if (!prod) return json({ error: 'Produit inconnu' }, 400)
      const isTrial = a === 'trial'
      const days = isTrial ? Math.max(1, Math.min(90, body.trial_days ?? 14)) : 0
      const trialEnds = isTrial ? new Date(Date.now() + days * 86400000).toISOString() : null
      await db.from('org_subscriptions').upsert({
        organization_id: org, product_key: prod.key,
        status: isTrial ? 'trial' : 'active',
        unit_price: prod.monthly_price, trial_ends_at: trialEnds,
        suspended_at: null, created_by: owner.id, updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,product_key' })
      const subId = await ensureSub(prod.key)
      if (subId) await addCoreFeatures(subId, prod.key)
      if (prod.is_home_eligible && !target.home_product) {
        await db.from('organizations').update({ home_product: prod.key }).eq('id', org)
      }
      meta = { product_key: prod.key, trial: isTrial, trial_days: isTrial ? days : undefined }
    } else if (a === 'set_status') {
      if (!body.product_key || !STATUSES.has(body.status ?? '')) return json({ error: 'product_key et status valides requis' }, 400)
      await db.from('org_subscriptions').update({
        status: body.status,
        suspended_at: body.status === 'suspended' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('organization_id', org).eq('product_key', body.product_key)
      meta = { product_key: body.product_key, status: body.status }
    } else if (a === 'remove') {
      if (!body.product_key) return json({ error: 'product_key requis' }, 400)
      await db.from('org_subscriptions').delete().eq('organization_id', org).eq('product_key', body.product_key)
      meta = { product_key: body.product_key }
    } else if (a === 'apply_plan') {
      const slug = body.plan_slug?.trim()
      if (!slug) return json({ error: 'plan_slug requis' }, 400)
      const { data: pps } = await db.from('plan_products').select('product_key').eq('plan_slug', slug)
      const products = (pps ?? []) as Array<{ product_key: string }>
      if (products.length === 0) return json({ error: 'Plan sans produit' }, 400)
      const { data: pbf } = await db.from('plan_bundle_features').select('product_key, feature_key').eq('plan_slug', slug)
      for (const p of products) {
        const prod = await requireProduct(p.product_key)
        if (!prod) continue
        await db.from('org_subscriptions').upsert({
          organization_id: org, product_key: prod.key, status: 'active',
          unit_price: prod.monthly_price, plan_slug: slug,
          trial_ends_at: null, suspended_at: null, created_by: owner.id, updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id,product_key' })
        const subId = await ensureSub(prod.key)
        if (!subId) continue
        for (const f of (pbf ?? []).filter((x: any) => x.product_key === prod.key)) {
          const { data: fp } = await db.from('product_features').select('monthly_price').eq('product_key', prod.key).eq('key', (f as any).feature_key).single()
          await db.from('org_subscription_features').upsert(
            { subscription_id: subId, feature_key: (f as any).feature_key, unit_price: (fp as any)?.monthly_price ?? 0 },
            { onConflict: 'subscription_id,feature_key' },
          )
        }
      }
      const { data: planRow } = await db.from('plans').select('home_product').eq('slug', slug).single()
      if ((planRow as any)?.home_product) await db.from('organizations').update({ home_product: (planRow as any).home_product }).eq('id', org)
      meta = { plan_slug: slug }
    } else if (a === 'set_discount' || a === 'set_product_discount') {
      const pct = body.discount_pct
      if (typeof pct !== 'number' || pct < 0 || pct > 100) return json({ error: 'discount_pct 0-100 requis' }, 400)
      if (a === 'set_discount') {
        await db.from('organizations').update({ discount_pct: pct }).eq('id', org)
        meta = { scope: 'org', discount_pct: pct }
      } else {
        if (!body.product_key) return json({ error: 'product_key requis' }, 400)
        await db.from('org_subscriptions').update({ discount_pct: pct, updated_at: new Date().toISOString() }).eq('organization_id', org).eq('product_key', body.product_key)
        meta = { scope: 'product', product_key: body.product_key, discount_pct: pct }
      }
    } else if (a === 'toggle_feature') {
      if (!body.product_key || !body.feature_key || typeof body.enabled !== 'boolean') return json({ error: 'product_key, feature_key, enabled requis' }, 400)
      const subId = await ensureSub(body.product_key)
      if (!subId) return json({ error: 'Abonnement produit inexistant' }, 400)
      if (body.enabled) {
        const { data: fp } = await db.from('product_features').select('monthly_price').eq('product_key', body.product_key).eq('key', body.feature_key).single()
        if (!fp) return json({ error: 'Feature inconnue' }, 400)
        await db.from('org_subscription_features').upsert(
          { subscription_id: subId, feature_key: body.feature_key, unit_price: (fp as any).monthly_price },
          { onConflict: 'subscription_id,feature_key' },
        )
      } else {
        await db.from('org_subscription_features').delete().eq('subscription_id', subId).eq('feature_key', body.feature_key)
      }
      meta = { product_key: body.product_key, feature_key: body.feature_key, enabled: body.enabled }
    } else if (a === 'set_home') {
      const prod = await requireProduct(body.product_key)
      if (!prod || !prod.is_home_eligible) return json({ error: 'Produit non éligible à l\'accueil' }, 400)
      await db.from('organizations').update({ home_product: prod.key }).eq('id', org)
      meta = { home_product: prod.key }
    } else {
      return json({ error: 'Action inconnue' }, 400)
    }

    try {
      await logAdminAction(admin, owner.id, `subscription.${a}`, 'organization', org, body.reason, { organization_name: target.name, ...meta })
    } catch (logErr) {
      console.error('[admin-subscription] audit log:', logErr instanceof Error ? logErr.message : logErr)
    }

    const { data: state } = await db.rpc('org_subscription_state', { p_org: org })
    return json({ success: true, state })
  } catch (err) {
    console.error('[admin-subscription]', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
