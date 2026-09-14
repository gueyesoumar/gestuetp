import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-stats
 *
 * Retourne les KPI plateforme agrégés cross-cabinet pour le tableau de bord
 * super-admin. Utilise le service-role pour bypasser les RLS standard.
 *
 * Le MRR est la SEULE source de vérité : platform_mrr() (RFC 0008 P0), qui somme
 * org_mrr() sur toutes les orgs (abonnements actifs + remises produit puis org).
 * Montant en FCFA (XOF). Pas d'intégration paiement — Stripe en Phase 2.
 */

interface StatsResponse {
  cabinets_active: number
  cabinets_total: number
  cabinets_suspended: number
  users_active_30d: number
  missions_in_progress: number
  mrr_xof: number
  orgs_by_nature: { cabinet: number; group: number; client: number; platform: number }
  trials_count: number
  new_orgs_30d: number
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
      .select('id, is_active, types, created_at')

    const allOrgs = (orgs ?? []) as Array<{ id: string; is_active: boolean; types: string[]; created_at: string }>
    const active = allOrgs.filter((o) => o.is_active)

    // Répartition par nature (types canoniques : cabinet | group | client | platform)
    const has = (o: { types: string[] }, t: string) => Array.isArray(o.types) && o.types.includes(t)
    const orgs_by_nature = {
      cabinet: allOrgs.filter((o) => has(o, 'cabinet')).length,
      group: allOrgs.filter((o) => has(o, 'group')).length,
      client: allOrgs.filter((o) => has(o, 'client')).length,
      platform: allOrgs.filter((o) => has(o, 'platform')).length,
    }
    const since30 = new Date(Date.now() - 30 * 86_400_000)
    const new_orgs_30d = allOrgs.filter((o) => o.created_at && new Date(o.created_at) >= since30).length

    // Essais en cours : orgs distinctes avec un droit status='trial'
    const { data: trialRows } = await admin.from('org_entitlements').select('organization_id').eq('status', 'trial')
    const trials_count = new Set(((trialRows ?? []) as Array<{ organization_id: string }>).map((r) => r.organization_id)).size

    // MRR : source unique platform_mrr() (RFC 0008 P0). Appelé en service_role
    // (auth.uid() null → passe-droit serveur de la fonction). FCFA.
    const { data: mrrData, error: mrrError } = await admin.rpc('platform_mrr')
    if (mrrError) console.error('admin-stats platform_mrr:', mrrError.message)
    const mrr = Number(mrrData ?? 0)

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
      mrr_xof: mrr,
      orgs_by_nature,
      trials_count,
      new_orgs_30d,
      alerts,
      activity_14d: activity,
    }

    return jsonResponse(resp as unknown as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-stats] error:', message)
    return jsonResponse({ error: 'Erreur interne' }, 500)
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
