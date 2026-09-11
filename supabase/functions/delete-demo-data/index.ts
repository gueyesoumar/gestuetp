import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'

/**
 * Edge Function : delete-demo-data (E4 — bac à sable)
 *
 * Supprime le bac à sable de l'APPELANT en un clic. Strictement borné aux lignes
 * is_demo=true ET demo_owner_id=appelant → ne touche JAMAIS une vraie donnée,
 * même une mission « clôturée » (le garde-fou de clôture de delete-mission ne
 * s'applique pas : on supprime directement en table, ce qui déclenche les
 * ON DELETE CASCADE des ~24 tables enfants d'une mission).
 *
 * Ordre imposé par les FK : missions (RESTRICT sur le nœud client) → fiche →
 * nœud organisation (best-effort, ignoré s'il reste référencé).
 */

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

    // 1. Missions de démo de l'appelant → suppression directe (cascade enfants).
    const { data: missions } = await admin
      .from('missions')
      .select('id')
      .eq('cabinet_id', cabinetId)
      .eq('is_demo', true)
      .eq('demo_owner_id', ownerId)
    const missionIds = (missions ?? []).map((m) => (m as { id: string }).id)
    for (const mid of missionIds) {
      const { error } = await admin.from('missions').delete().eq('id', mid).eq('is_demo', true).eq('demo_owner_id', ownerId)
      if (error) console.warn('[delete-demo-data] mission', mid, error.message)
    }

    // 2. Fiches de démo de l'appelant.
    const { data: fiches } = await admin
      .from('cabinet_clients')
      .select('id, client_org_id')
      .eq('cabinet_id', cabinetId)
      .eq('is_demo', true)
      .eq('demo_owner_id', ownerId)
    const orgIds = (fiches ?? []).map((f) => (f as { client_org_id: string | null }).client_org_id).filter((v): v is string => !!v)

    const { error: ficheErr } = await admin
      .from('cabinet_clients')
      .delete()
      .eq('cabinet_id', cabinetId)
      .eq('is_demo', true)
      .eq('demo_owner_id', ownerId)
    if (ficheErr) console.warn('[delete-demo-data] fiches:', ficheErr.message)

    // 3. Nœuds organisation de démo (best-effort) : arête d'engagement puis nœud.
    //    Si un nœud reste référencé (ne devrait pas hors démo), on ignore l'échec.
    for (const orgId of orgIds) {
      await admin.from('organization_relationships').delete().eq('target_org_id', orgId)
      const { error } = await admin.from('organizations').delete().eq('id', orgId).contains('types', ['client'])
      if (error) console.warn('[delete-demo-data] org node', orgId, error.message)
    }

    await logActivity(admin, {
      organizationId: cabinetId,
      actorUserId: ownerId,
      action: 'demo.deleted',
      targetType: 'client',
      targetLabel: 'Client Démo',
      summary: `Bac à sable supprimé (${missionIds.length} mission(s))`,
    })

    return json({ ok: true, deleted_missions: missionIds.length, deleted_clients: (fiches ?? []).length })
  } catch (err) {
    console.error('[delete-demo-data]', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
