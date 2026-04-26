import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-stats
 *
 * Retourne les KPI plateforme agrégés cross-cabinet pour le tableau de bord
 * super-admin. Utilise le service-role pour bypasser les RLS standard.
 *
 * Le MRR est un placeholder calculé naïvement comme
 *   Σ (cabinets actifs × monthly_price_eur du plan)
 * Pas d'intégration paiement — Stripe en Phase 2.
 */

interface StatsResponse {
  cabinets_active: number
  cabinets_total: number
  cabinets_suspended: number
  users_active_30d: number
  missions_in_progress: number
  mrr_eur_estimated: number
  alerts: Array<{ kind: 'warn' | 'info' | 'red'; message: string }>
  activity_14d: number[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { admin } = guard

  try {
    // Toutes les organisations (cabinets, clients, groupes, plateforme)
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, is_active, types, plan_id, plans(monthly_price_eur)')

    const allOrgs = (orgs ?? []) as Array<{ id: string; is_active: boolean; types: string[]; plans: { monthly_price_eur: number } | null }>
    const active = allOrgs.filter((o) => o.is_active)

    // MRR : Σ (orgs actives × tarif du plan, si plan)
    const mrr = active.reduce((sum, o) => sum + Number(o.plans?.monthly_price_eur ?? 0), 0)

    // Utilisateurs actifs sur 30 jours (last_sign_in_at)
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const { count: usersActive30d } = await admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_sign_in_at', since)

    // Missions en cours (status != closure et != archived)
    const { count: missionsInProgress } = await admin
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'closure')
      .eq('is_active', true)

    // Activité 14j : count missions touchées par jour (proxy via mission updated_at)
    const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString()
    const { data: recent } = await admin
      .from('missions')
      .select('updated_at')
      .gte('updated_at', since14)

    const activity = bucketByDay((recent ?? []) as Array<{ updated_at: string }>, 14)

    // Alertes
    const alerts: StatsResponse['alerts'] = []
    const suspended = allOrgs.filter((o) => !o.is_active).length
    if (suspended > 0) {
      alerts.push({ kind: 'info', message: `${suspended} organisation(s) actuellement suspendue(s)` })
    }

    const resp: StatsResponse = {
      cabinets_active: active.length,
      cabinets_total: allOrgs.length,
      cabinets_suspended: suspended,
      users_active_30d: usersActive30d ?? 0,
      missions_in_progress: missionsInProgress ?? 0,
      mrr_eur_estimated: mrr,
      alerts,
      activity_14d: activity,
    }

    return jsonResponse(resp as unknown as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-stats] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function bucketByDay(rows: Array<{ updated_at: string }>, days: number): number[] {
  const buckets = new Array(days).fill(0)
  const now = Date.now()
  for (const r of rows) {
    const ts = new Date(r.updated_at).getTime()
    const idx = Math.floor((now - ts) / 86_400_000)
    if (idx >= 0 && idx < days) buckets[days - 1 - idx]++
  }
  return buckets
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
