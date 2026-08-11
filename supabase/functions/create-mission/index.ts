import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

type MissionKind = 'audit' | 'continuous_supervision'

interface CreateMissionPayload {
  name: string
  description: string
  /** Chemin Comply : fiche client du cabinet. */
  cabinet_client_id?: string
  /** Chemin Regul : organisation assujettie (entité du sous-arbre régulateur). */
  assujetti_org_id?: string
  framework_id: string
  lead_auditor_id: string
  associate_id: string
  start_date: string
  end_date: string
  member_ids: string[]
  kind?: MissionKind
  /** Périmètre optionnel : CONTRÔLES retenus. Le complément est persisté en
   *  exclusions (mission_exclusions). Absent -> aucune exclusion (rétro-compatible). */
  scope_control_ids?: string[]
}

function quarterLabel(dateIso: string): string {
  const d = new Date(dateIso)
  const q = Math.floor(d.getUTCMonth() / 3) + 1
  return `Q${q} ${d.getUTCFullYear()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Identifier l'appelant via le JWT (Authorization OU x-auth-token).
    //    L'identite provient EXCLUSIVEMENT du token verifie cryptographiquement
    //    par auth.getUser. Aucun fallback sur un header fourni par le client :
    //    ce serait une usurpation d'identite (le client tourne en service_role,
    //    donc plus aucune barriere RLS ne rattraperait la fuite).
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')

    let callerId: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (!authError && user) {
        callerId = user.id
      }
    }

    if (!callerId) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Profil de l'appelant
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('auth_id', callerId)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2.bis Permissions cabinet — can_create_mission obligatoire
    if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_create_mission'))) {
      return new Response(
        JSON.stringify({ error: 'Permission can_create_mission requise' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parser le payload
    const body: CreateMissionPayload = await req.json()
    const {
      name, description, cabinet_client_id, framework_id,
      lead_auditor_id, associate_id, start_date, end_date, member_ids,
    } = body
    const kind: MissionKind = body.kind === 'continuous_supervision' ? 'continuous_supervision' : 'audit'

    if (!name || !framework_id || !lead_auditor_id || !associate_id || !start_date || !end_date || (!cabinet_client_id && !body.assujetti_org_id)) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3.bis Permissions sur la désignation du chef de mission
    // - Si on désigne quelqu'un d'autre que soi-même → can_designate_lead requis
    // - Le désigné doit avoir can_be_lead
    if (lead_auditor_id !== callerProfile.id) {
      if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_designate_lead'))) {
        return new Response(
          JSON.stringify({ error: 'Permission can_designate_lead requise pour désigner un autre chef de mission' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    if (!(await hasCabinetPerm(supabaseAdmin, lead_auditor_id, 'can_be_lead'))) {
      return new Response(
        JSON.stringify({ error: 'Le chef de mission désigné n\'a pas la permission can_be_lead' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3.ter Séparation des devoirs + cloisonnement de l'équipe (constats E3/M1).
    // - L'associé (validateur ultime) et le chef doivent être DEUX personnes
    //   distinctes, sinon une seule personne peut produire ET valider un audit.
    // - Chef, associé et membres doivent appartenir à l'organisation de l'appelant
    //   (create_mission_tx tourne en service_role et ne le vérifie pas).
    if (associate_id === lead_auditor_id) {
      return new Response(
        JSON.stringify({ error: 'L\'associé et le chef de mission doivent être deux personnes différentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const teamIds = [...new Set([lead_auditor_id, associate_id, ...(member_ids ?? [])].filter(Boolean))]
    const { data: teamRows, error: teamErr } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .in('id', teamIds)
    if (teamErr) {
      console.error('create-mission team check:', teamErr.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification de l\'équipe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if ((teamRows?.length ?? 0) !== teamIds.length ||
        (teamRows ?? []).some((u: { organization_id: string }) => u.organization_id !== callerProfile.organization_id)) {
      return new Response(
        JSON.stringify({ error: 'Un membre de l\'équipe n\'appartient pas à votre organisation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4-5. Résoudre l'organisation cible (client audité).
    let clientOrgId: string | null = null

    if (body.assujetti_org_id) {
      // Chemin Regul : l'assujetti est une organisation entité. Cloisonnement —
      // il doit appartenir au sous-arbre du régulateur appelant (get_subsidiary_ids
      // récursif, SECURITY DEFINER). Pas de fiche cabinet_clients requise.
      const { data: descRows } = await supabaseAdmin.rpc('get_subsidiary_ids', { parent_id: callerProfile.organization_id })
      const descendants = new Set<string>(
        ((descRows ?? []) as Array<string | { get_subsidiary_ids?: string; id?: string }>)
          .map((r) => (typeof r === 'string' ? r : (r.get_subsidiary_ids ?? r.id ?? '')))
      )
      if (!descendants.has(body.assujetti_org_id)) {
        return new Response(
          JSON.stringify({ error: "Cet assujetti n'appartient pas à votre périmètre" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      clientOrgId = body.assujetti_org_id
    } else {
      // Chemin Comply : via la fiche client du cabinet.
      const { data: cabinetClient, error: ccError } = await supabaseAdmin
        .from('cabinet_clients')
        .select('id, cabinet_id, client_org_id, client_name, client_registration_number, client_email_domain')
        .eq('id', cabinet_client_id)
        .single()

      if (ccError || !cabinetClient) {
        return new Response(
          JSON.stringify({ error: 'Client introuvable' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (cabinetClient.cabinet_id !== callerProfile.organization_id) {
        return new Response(
          JSON.stringify({ error: 'Accès interdit à ce client' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      clientOrgId = cabinetClient.client_org_id
      if (!clientOrgId) {
        if (cabinetClient.client_registration_number) {
          const { data: existing } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .contains('types', ['client'])
            .eq('registration_number', cabinetClient.client_registration_number)
            .limit(1)
          if (existing && existing.length > 0) clientOrgId = existing[0].id
        }
        if (!clientOrgId) {
          const slug = cabinetClient.client_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36)
          const { data: newOrg, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({ name: cabinetClient.client_name, slug, types: ['client'] })
            .select('id')
            .single()
          if (orgError || !newOrg) {
            console.error('create-mission create org:', orgError?.message)
            return new Response(
              JSON.stringify({ error: 'Erreur lors de la création de l\'organisation client' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          clientOrgId = newOrg.id
        }
        await supabaseAdmin
          .from('cabinet_clients')
          .update({ client_org_id: clientOrgId })
          .eq('id', cabinet_client_id)
      }
    }

    // 6. Verifier que le referentiel existe
    const { data: framework, error: fwError } = await supabaseAdmin
      .from('frameworks')
      .select('id')
      .eq('id', framework_id)
      .single()

    if (fwError || !framework) {
      return new Response(
        JSON.stringify({ error: 'Référentiel introuvable' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6.bis Périmètre optionnel (refonte création) : le front fournit les CONTRÔLES
    //       retenus (granularité la plus fine). On persiste le complément en
    //       exclusions (modèle cohérent avec le cadrage). Absent -> aucune exclusion
    //       (rétro-compatible avec l'écran Regul et l'ancien front Comply).
    let excludedControlIds: string[] = []
    const scopeControlIds = Array.isArray(body.scope_control_ids) ? body.scope_control_ids.filter(Boolean) : []
    if (scopeControlIds.length > 0) {
      // Ensemble complet des contrôles du référentiel (via ses domaines).
      const { data: fwDomains, error: domErr } = await supabaseAdmin
        .from('domains')
        .select('id')
        .eq('framework_id', framework_id)
      if (domErr) {
        console.error('create-mission domains:', domErr.message)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la résolution du périmètre' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const domainIds = (fwDomains ?? []).map((d: { id: string }) => d.id)
      const { data: fwControls, error: ctrlErr } = await supabaseAdmin
        .from('controls')
        .select('id')
        .in('domain_id', domainIds)
      if (ctrlErr) {
        console.error('create-mission controls:', ctrlErr.message)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la résolution du périmètre' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const allControlIds = new Set((fwControls ?? []).map((c: { id: string }) => c.id))
      // IDOR : refuser tout contrôle retenu hors du référentiel de la mission.
      if (scopeControlIds.some((id) => !allControlIds.has(id))) {
        return new Response(
          JSON.stringify({ error: 'Périmètre invalide : un contrôle n\'appartient pas au référentiel' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const retained = new Set(scopeControlIds)
      excludedControlIds = [...allControlIds].filter((id) => !retained.has(id))
    }

    // 6.ter En supervision continue, bornes du 1er cycle (trimestre courant / start_date).
    let cycleLabel: string | null = null
    let cycleStart: string | null = null
    let cycleEnd: string | null = null
    if (kind === 'continuous_supervision') {
      const startD = new Date(start_date)
      const quarterStartMonth = startD.getUTCMonth() - (startD.getUTCMonth() % 3)
      cycleLabel = quarterLabel(start_date)
      cycleStart = new Date(Date.UTC(startD.getUTCFullYear(), quarterStartMonth, 1)).toISOString().slice(0, 10)
      cycleEnd = new Date(Date.UTC(startD.getUTCFullYear(), quarterStartMonth + 3, 0)).toISOString().slice(0, 10)
    }

    // 7. Créer la mission + cycle + membres + exclusions EN UNE TRANSACTION
    //    (create_mission_tx, SECURITY DEFINER). Atomicité : plus d'état partiel
    //    (mission sans équipe) comme avec les inserts séparés d'avant.
    const { data: newMissionId, error: txError } = await supabaseAdmin.rpc('create_mission_tx', {
      p_cabinet_id: callerProfile.organization_id,
      p_client_id: clientOrgId,
      p_framework_id: framework_id,
      p_name: name,
      p_description: description ?? '',
      p_kind: kind,
      p_lead_auditor_id: lead_auditor_id,
      p_associate_id: associate_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_member_ids: member_ids ?? [],
      p_excluded_control_ids: excludedControlIds,
      p_created_by: callerProfile.id,
      p_cycle_label: cycleLabel,
      p_cycle_start: cycleStart,
      p_cycle_end: cycleEnd,
    })

    if (txError || !newMissionId) {
      console.error('create-mission tx:', txError?.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la mission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, mission_id: newMissionId }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('create-mission unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
