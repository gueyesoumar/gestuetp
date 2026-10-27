import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'
import { notifyMany } from '../_shared/notify.ts'

/**
 * Edge launch-review (n°18 Lot 3a). Crée un contrôle de REVUE pré-rempli à partir
 * d'une mission clôturée précédente (même assujetti + référentiel) : même moteur,
 * même périmètre (exclusions), même équipe si disponible, et lien review_of_mission_id.
 * L'évaluation N-1 est retrouvée à l'affichage via ce lien (pas de seeding).
 */
function quarterLabel(d: Date): string {
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`
}

interface SourceMission {
  id: string; cabinet_id: string; client_id: string; framework_id: string
  kind: string; workflow_template_id: string | null
  lead_auditor_id: string | null; associate_id: string | null; name: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Appelant via JWT (jamais de header de confiance : l'edge tourne en service_role).
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')
    let callerAuthId: string | null = null
    if (authHeader) {
      const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
      callerAuthId = user?.id ?? null
    }
    if (!callerAuthId) return json({ error: 'Non autorisé' }, 401)

    const { data: caller } = await admin.from('users').select('id, organization_id').eq('auth_id', callerAuthId).single()
    if (!caller) return json({ error: 'Profil introuvable' }, 403)
    if (!(await hasCabinetPerm(admin, caller.id, 'can_create_mission'))) {
      return json({ error: 'Permission can_create_mission requise' }, 403)
    }

    // 2. Mission source.
    const { source_mission_id } = await req.json() as { source_mission_id?: string }
    if (!source_mission_id) return json({ error: 'Mission source manquante' }, 400)
    const { data: src } = await admin
      .from('missions')
      .select('id, cabinet_id, client_id, framework_id, kind, workflow_template_id, lead_auditor_id, associate_id, name')
      .eq('id', source_mission_id)
      .maybeSingle() as { data: SourceMission | null }
    if (!src) return json({ error: 'Mission source introuvable' }, 404)
    // Cloisonnement : la mission source doit appartenir à l'organisation de l'appelant.
    if (src.cabinet_id !== caller.organization_id) return json({ error: 'Accès interdit à cette mission' }, 403)

    // 3. Anti-doublon : pas de revue si un contrôle non clôturé existe déjà (même couple).
    const { data: openOnes } = await admin
      .from('missions')
      .select('id')
      .eq('client_id', src.client_id).eq('framework_id', src.framework_id)
      .neq('status', 'closure').eq('is_active', true)
      .limit(1)
    if ((openOnes ?? []).length > 0) {
      return json({ error: 'Un contrôle est déjà en cours pour ce référentiel', existing_mission_id: (openOnes as Array<{ id: string }>)[0].id }, 409)
    }

    // 4. Équipe (Option A) : rôles repris DEPUIS mission_members (source de vérité :
    //    « Gérer l'équipe » y modifie les rôles sans toucher les colonnes de la mission).
    //    On préserve le rôle exact de chaque membre ACTIF ; on n'affecte JAMAIS un
    //    compte désactivé. Si un responsable (chef/associé) est désactivé, on comble le
    //    poste vacant avec un membre actif restant et on renvoie un avertissement.
    const { data: srcMembers } = await admin.from('mission_members').select('user_id, role').eq('mission_id', src.id)
    const members = (srcMembers ?? []) as Array<{ user_id: string; role: string }>
    const memberUserIds = [...new Set(members.map((m) => m.user_id))]
    const validSet = new Set<string>()
    if (memberUserIds.length > 0) {
      const { data: valid } = await admin.from('users').select('id').in('id', memberUserIds).eq('organization_id', caller.organization_id).eq('is_active', true)
      for (const u of (valid ?? []) as Array<{ id: string }>) validSet.add(u.id)
    }
    const activeMembers = members.filter((m) => validSet.has(m.user_id))
    const activeIds = [...new Set(activeMembers.map((m) => m.user_id))]
    const roleOf = new Map(activeMembers.map((m) => [m.user_id, m.role]))

    // Chef : chef actif de la source, sinon un auditeur actif promu, sinon l'appelant.
    const lead = activeMembers.find((m) => m.role === 'lead_auditor')?.user_id
      ?? activeMembers.find((m) => m.role === 'auditor')?.user_id
      ?? caller.id
    // Associé : Directeur actif de la source (!= chef), sinon un autre actif, sinon l'appelant.
    const associate = activeMembers.find((m) => m.role === 'associate' && m.user_id !== lead)?.user_id
      ?? activeIds.find((id) => id !== lead)
      ?? (caller.id !== lead ? caller.id : null)
    if (!associate) return json({ error: 'Équipe de la mission source indisponible : créez le contrôle manuellement' }, 400)
    const memberIds = [...new Set([lead, associate, ...activeIds])]

    // Avertissement si un responsable source a été écarté (désactivé) -> rôles ajustés.
    const droppedResponsible = members.some((m) => (m.role === 'lead_auditor' || m.role === 'associate') && !validSet.has(m.user_id))
    const teamWarning = (droppedResponsible || roleOf.get(lead) !== 'lead_auditor' || roleOf.get(associate) !== 'associate')
      ? 'Un responsable de la mission source est désactivé : l\'équipe de la revue a été ajustée, vérifiez les rôles.'
      : null

    // 5. Périmètre : on recopie les exclusions de la source.
    const { data: excl } = await admin.from('mission_exclusions').select('control_id').eq('mission_id', src.id)
    const excludedControlIds = ((excl ?? []) as Array<{ control_id: string }>).map((e) => e.control_id)

    // 6. Dates par défaut : aujourd'hui -> +90 j (ajustables ensuite).
    const today = new Date()
    const start = today.toISOString().slice(0, 10)
    const end = new Date(today.getTime() + 90 * 86_400_000).toISOString().slice(0, 10)
    const name = `${src.name} (revue ${quarterLabel(today)})`

    // 7. Création atomique (même logique que create-mission).
    const { data: newMissionId, error: txErr } = await admin.rpc('create_mission_tx', {
      p_cabinet_id: src.cabinet_id, p_client_id: src.client_id, p_framework_id: src.framework_id,
      p_name: name, p_description: '', p_kind: src.kind,
      p_lead_auditor_id: lead, p_associate_id: associate,
      p_start_date: start, p_end_date: end,
      p_member_ids: memberIds, p_excluded_control_ids: excludedControlIds,
      p_created_by: caller.id, p_cycle_label: null, p_cycle_start: null, p_cycle_end: null,
      p_template_id: src.workflow_template_id,
    })
    if (txErr || !newMissionId) { console.error('[launch-review] tx:', txErr?.message); return json({ error: 'Création du contrôle de revue impossible' }, 500) }

    // 8. Lien de revue.
    const { error: linkErr } = await admin.from('missions').update({ review_of_mission_id: src.id }).eq('id', newMissionId)
    if (linkErr) console.error('[launch-review] link:', linkErr.message)

    // 8.bis Acteurs : les interlocuteurs SI sont stockés par mission (client_contacts).
    //       On les recopie depuis la source pour pré-remplir la revue (non bloquant).
    const { data: srcContacts } = await admin
      .from('client_contacts')
      .select('name, job_title, department, email, phone, is_primary')
      .eq('mission_id', src.id)
    const contacts = (srcContacts ?? []) as Array<Record<string, unknown>>
    if (contacts.length > 0) {
      const { error: copyErr } = await admin
        .from('client_contacts')
        .insert(contacts.map((c) => ({ ...c, mission_id: newMissionId })))
      if (copyErr) console.error('[launch-review] copy contacts:', copyErr.message)
    }

    await logActivity(admin, {
      organizationId: caller.organization_id, actorUserId: caller.id,
      action: 'mission.review_launched', targetType: 'mission', targetId: newMissionId as string, targetLabel: name,
      summary: `Revue lancée : ${name}`,
    })
    await notifyMany(admin, memberIds.filter((id) => id !== caller.id), {
      type: 'mission_assigned', title: 'Nouvelle revue de conformité',
      body: `Vous avez été affecté(e) à la revue « ${name} ».`,
      link: `/missions/${newMissionId}`, metadata: { mission_id: newMissionId, review_of: src.id },
    })

    return json({ success: true, mission_id: newMissionId, warning: teamWarning }, 201)
  } catch (err) {
    console.error('[launch-review]', err instanceof Error ? err.message : String(err))
    return json({ error: 'Erreur interne' }, 500)
  }
})
