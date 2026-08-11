import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller, sameCabinet, ACCESS_DENIED } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

interface AssignmentEntry {
  control_id: string
  auditor_id: string
}

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Authentifier l'appelant (+ is_active)
    const auth = await authenticateCaller(supabaseAdmin, req)
    if (!auth.ok) return jsonError(auth.message, auth.status)
    const callerProfile = auth.profile

    // 2. Parser le payload
    const { mission_id, assignments } = await req.json() as {
      mission_id: string
      assignments: AssignmentEntry[]
    }

    if (!mission_id || !assignments || assignments.length === 0) {
      return jsonError('mission_id et assignments requis', 400)
    }

    // 3. Verifier que la mission existe
    const { data: mission, error: mErr } = await supabaseAdmin
      .from('missions')
      .select('id, cabinet_id, framework_id, associate_id')
      .eq('id', mission_id)
      .single()

    if (mErr || !mission) return jsonError('Mission introuvable', 404)

    // 4. Cloisonnement cabinet + permission requise
    if (!sameCabinet(callerProfile, mission.cabinet_id)) {
      return jsonError(ACCESS_DENIED, 403)
    }
    if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_assign_team'))) {
      return jsonError('Permission can_assign_team requise', 403)
    }

    // 4b. Valider que chaque auditeur appartient au cabinet de la mission
    const auditorIds = [...new Set(assignments.map((a) => a.auditor_id))]
    const { data: validAuditors } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('id', auditorIds)
      .eq('organization_id', mission.cabinet_id)
    if ((validAuditors ?? []).length !== auditorIds.length) {
      return jsonError('Un auditeur ne fait pas partie du cabinet', 403)
    }

    // 4b-bis. L'associé est le validateur ultime : il ne peut PAS se voir affecter
    //          de contrôle, sinon il validerait sa propre évaluation (SoD, constat M2).
    if (mission.associate_id && auditorIds.includes(mission.associate_id)) {
      return jsonError('L\'associé (validateur ultime) ne peut pas être affecté à des contrôles', 400)
    }

    // 4c. Valider que chaque contrôle appartient au référentiel de la mission
    const controlIds = [...new Set(assignments.map((a) => a.control_id))]
    const { data: ctrlRows } = await supabaseAdmin
      .from('controls')
      .select('id, domain_id')
      .in('id', controlIds)
    if ((ctrlRows ?? []).length !== controlIds.length) {
      return jsonError('Contrôle inconnu', 400)
    }
    const domainIds = [...new Set((ctrlRows as Array<{ domain_id: string }>).map((c) => c.domain_id))]
    const { data: domRows } = await supabaseAdmin
      .from('domains')
      .select('id, framework_id')
      .in('id', domainIds)
    if (!(domRows as Array<{ framework_id: string }> ?? []).every((d) => d.framework_id === mission.framework_id)) {
      return jsonError('Un contrôle n\'appartient pas au référentiel de la mission', 400)
    }

    // 5. Inserer les affectations (upsert pour eviter les doublons)
    const entries = assignments.map((a: AssignmentEntry) => ({
      mission_id,
      control_id: a.control_id,
      auditor_id: a.auditor_id,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('mission_control_assignments')
      .upsert(entries, { onConflict: 'mission_id,control_id' })

    if (insertError) {
      console.error('assign-controls insert:', insertError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'affectation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Creer les control_assessments en brouillon pour chaque affectation
    const assessmentEntries = entries.map((e: { mission_id: string; control_id: string; auditor_id: string }) => ({
      mission_id: e.mission_id,
      control_id: e.control_id,
      auditor_id: e.auditor_id,
      status: 'draft',
    }))

    const { error: assessError } = await supabaseAdmin
      .from('control_assessments')
      .upsert(assessmentEntries, { onConflict: 'mission_id,control_id' })

    if (assessError) {
      console.error('assign-controls assessments:', assessError.message)
    }

    // 7. Mettre a jour le statut vers 'planning' si pas encore fait
    await supabaseAdmin
      .from('missions')
      .update({ status: 'planning' })
      .eq('id', mission_id)
      .in('status', ['initialization', 'scoping'])

    return new Response(
      JSON.stringify({ success: true, count: entries.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('assign-controls unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
