import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AssignmentEntry {
  control_id: string
  auditor_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Verifier l'appelant
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parser le payload
    const { mission_id, assignments } = await req.json() as {
      mission_id: string
      assignments: AssignmentEntry[]
    }

    if (!mission_id || !assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'mission_id et assignments requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verifier que la mission existe
    const { data: mission, error: mErr } = await supabaseAdmin
      .from('missions')
      .select('id, cabinet_id')
      .eq('id', mission_id)
      .single()

    if (mErr || !mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verifier que l'appelant est dans le cabinet
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile || callerProfile.organization_id !== mission.cabinet_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
