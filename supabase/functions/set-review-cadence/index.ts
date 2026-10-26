import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

// n°18 Lot 1 : définir/mettre à jour la cadence de revue d'un couple (assujetti,
// référentiel). Écriture réservée au backend (service_role) : la table est en RLS
// lecture seule pour authenticated. Garde : staff régulateur avec la permission
// can_manage_supervision_assignments, assujetti dans son sous-arbre.
function addMonths(iso: string, months: number): string {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s: number): Response =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !caller) return json({ error: 'Non autorisé' }, 401)

    const { data: cp } = await admin.from('users').select('id, organization_id, is_active').eq('auth_id', caller.id).single()
    if (!cp || !cp.is_active) return json({ error: 'Profil introuvable' }, 403)
    if (!(await hasCabinetPerm(admin, cp.id, 'can_manage_supervision_assignments'))) {
      return json({ error: 'Permission can_manage_supervision_assignments requise' }, 403)
    }

    const { organization_id, framework_id, frequency_months } = await req.json() as {
      organization_id: string; framework_id: string; frequency_months: number | null
    }
    if (!organization_id || !framework_id) return json({ error: 'organization_id et framework_id requis' }, 400)

    // Cloisonnement : l'assujetti doit être dans le sous-arbre de l'appelant.
    const { data: descRows } = await admin.rpc('get_subsidiary_ids', { parent_id: cp.organization_id })
    // deno-lint-ignore no-explicit-any
    const subtree = new Set<string>(((descRows ?? []) as any[]).map((r) => (typeof r === 'string' ? r : (r.get_subsidiary_ids ?? r.id ?? ''))))
    if (!subtree.has(organization_id)) return json({ error: 'Assujetti hors de votre périmètre' }, 403)

    // last_reviewed_at : conserver l'existant, sinon repli sur la dernière mission
    // clôturée sur ce couple (end_date).
    const { data: existing } = await admin
      .from('assujetti_review_cycles')
      .select('last_reviewed_at, last_mission_id')
      .eq('organization_id', organization_id).eq('framework_id', framework_id).maybeSingle()
    const e = existing as { last_reviewed_at: string | null; last_mission_id: string | null } | null

    let lastReviewedAt = e?.last_reviewed_at ?? null
    let lastMissionId = e?.last_mission_id ?? null
    if (!lastReviewedAt) {
      const { data: lastM } = await admin
        .from('missions').select('id, end_date')
        .eq('client_id', organization_id).eq('framework_id', framework_id).eq('status', 'closure')
        .order('end_date', { ascending: false }).limit(1).maybeSingle()
      const lm = lastM as { id: string; end_date: string | null } | null
      if (lm?.end_date) { lastReviewedAt = lm.end_date; lastMissionId = lm.id }
    }

    const freq = typeof frequency_months === 'number' && frequency_months > 0 ? frequency_months : null
    const nextReviewAt = freq && lastReviewedAt ? addMonths(lastReviewedAt, freq) : null

    const { error: upErr } = await admin.from('assujetti_review_cycles').upsert({
      organization_id, framework_id, frequency_months: freq,
      last_reviewed_at: lastReviewedAt, last_mission_id: lastMissionId,
      next_review_at: nextReviewAt, updated_at: new Date().toISOString(),
      // deno-lint-ignore no-explicit-any
    } as any, { onConflict: 'organization_id,framework_id' })
    if (upErr) { console.error('set-review-cadence upsert:', upErr.message); return json({ error: 'Enregistrement impossible' }, 500) }

    return json({ success: true, next_review_at: nextReviewAt }, 200)
  } catch (err) {
    console.error('set-review-cadence unexpected:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
