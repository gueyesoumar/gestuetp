import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'

/**
 * Edge Function : seed-demo-data (E4 — bac à sable)
 *
 * Crée un espace de démonstration JETABLE, PAR UTILISATEUR (demo_owner_id).
 *  - variant 'guided'    : une fiche « Client Démo » seule. L'utilisateur crée
 *                          lui-même sa mission (apprentissage par la pratique).
 *  - variant 'prefilled' : + une mission de démo déjà créée (prête à travailler).
 *
 * Sécurité : force TOUJOURS is_demo=true + demo_owner_id=appelant, plafonné à
 * un seul jeu par utilisateur (anti-spam). Non gaté sur les permissions cabinet :
 * un nouvel arrivant doit pouvoir essayer, la donnée étant cloisonnée et exclue
 * des indicateurs. is_demo n'est PAS une frontière de sécurité.
 */

interface SeedPayload {
  variant?: 'guided' | 'prefilled'
}

const DEMO_CLIENT_NAME = 'Client Démo'

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function demoSlug(): string {
  return `client-demo-${Date.now().toString(36)}`
}

function isoDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Appelant via JWT vérifié uniquement.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !caller) return json({ error: 'Non autorisé' }, 401)

    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, organization_id')
      .eq('auth_id', caller.id)
      .single()
    if (profileError || !profile?.organization_id) return json({ error: 'Profil introuvable' }, 403)
    const cabinetId = (profile as { id: string; organization_id: string }).organization_id
    const ownerId = (profile as { id: string }).id

    const body = (await req.json().catch(() => ({}))) as SeedPayload
    const variant = body.variant === 'prefilled' ? 'prefilled' : 'guided'

    // 2. Plafond : un seul bac à sable par utilisateur — on renvoie l'existant.
    const { data: existing } = await admin
      .from('cabinet_clients')
      .select('id, client_org_id')
      .eq('cabinet_id', cabinetId)
      .eq('is_demo', true)
      .eq('demo_owner_id', ownerId)
      .maybeSingle()
    if (existing) {
      return json({ ok: true, already: true, cabinet_client_id: (existing as { id: string }).id })
    }

    // 3. Nœud organisation de démo (type client).
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: DEMO_CLIENT_NAME, slug: demoSlug(), types: ['client'] })
      .select('id')
      .single()
    if (orgError || !org) {
      console.error('[seed-demo-data] org:', orgError?.message)
      return json({ error: 'Création de la démo impossible' }, 500)
    }
    const clientOrgId = (org as { id: string }).id

    // 4. Fiche client de démo (marquée is_demo + propriétaire).
    const { data: fiche, error: ficheError } = await admin
      .from('cabinet_clients')
      .insert({ cabinet_id: cabinetId, client_org_id: clientOrgId, is_demo: true, demo_owner_id: ownerId })
      .select('id')
      .single()
    if (ficheError || !fiche) {
      console.error('[seed-demo-data] fiche:', ficheError?.message)
      await admin.from('organizations').delete().eq('id', clientOrgId)
      return json({ error: 'Création de la démo impossible' }, 500)
    }
    const ficheId = (fiche as { id: string }).id

    // 5. Variante pré-remplie : une mission de démo prête à travailler.
    let missionId: string | null = null
    if (variant === 'prefilled') {
      const { data: fw } = await admin
        .from('frameworks')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
        .limit(1)
        .maybeSingle()
      if (fw) {
        const framework = fw as { id: string; name: string }
        // deno-lint-ignore no-explicit-any
        const { data: newMissionId, error: txError } = await (admin.rpc as any)('create_mission_tx', {
          p_cabinet_id: cabinetId,
          p_client_id: clientOrgId,
          p_framework_id: framework.id,
          p_name: `Audit ${framework.name} — Démo`,
          p_description: 'Mission de démonstration (bac à sable).',
          p_kind: 'audit',
          p_lead_auditor_id: ownerId,
          p_associate_id: null,
          p_start_date: isoDate(0),
          p_end_date: isoDate(30),
          p_member_ids: [ownerId],
          p_excluded_control_ids: [],
          p_created_by: ownerId,
        })
        if (txError || !newMissionId) {
          console.warn('[seed-demo-data] create_mission_tx:', txError?.message ?? 'no id')
        } else {
          missionId = newMissionId as string
          // Marquer la mission comme démo (le RPC ne connaît pas ces colonnes).
          // deno-lint-ignore no-explicit-any
          const { error: markError } = await (admin.from('missions') as any)
            .update({ is_demo: true, demo_owner_id: ownerId })
            .eq('id', missionId)
          if (markError) console.warn('[seed-demo-data] mark mission:', markError.message)
        }
      }
    }

    // L'insertion de mission (variante B) crée une arête d'engagement via trigger.
    // On la retire : le bac à sable ne doit pas apparaître dans le graphe des
    // perspectives du Hub (tuiles clients). No-op en variante A (pas d'arête).
    await admin
      .from('organization_relationships')
      .delete()
      .eq('actor_org_id', cabinetId)
      .eq('target_org_id', clientOrgId)
      .eq('nature', 'audit_engagement')

    await logActivity(admin, {
      organizationId: cabinetId,
      actorUserId: ownerId,
      action: 'demo.seeded',
      targetType: 'client',
      targetId: ficheId,
      targetLabel: DEMO_CLIENT_NAME,
      summary: `Bac à sable créé (${variant})`,
    })

    return json({ ok: true, cabinet_client_id: ficheId, client_org_id: clientOrgId, mission_id: missionId, variant })
  } catch (err) {
    console.error('[seed-demo-data]', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
