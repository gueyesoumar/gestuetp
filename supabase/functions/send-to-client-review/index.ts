import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parser le payload
    const { mission_id, assessment_ids } = await req.json() as {
      mission_id: string
      assessment_ids?: string[]
    }

    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verifier que l'appelant est chef de mission ou associé
    const { data: mission } = await supabaseAdmin
      .from('missions')
      .select('id, lead_auditor_id, associate_id')
      .eq('id', mission_id)
      .single()

    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (mission.lead_auditor_id !== callerProfile.id && mission.associate_id !== callerProfile.id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Selectionner les assessments approuvés en interne (ou ceux spécifiés)
    let query = supabaseAdmin
      .from('control_assessments')
      .select('id')
      .eq('mission_id', mission_id)
      .eq('status', 'approved')

    if (assessment_ids && assessment_ids.length > 0) {
      query = query.in('id', assessment_ids)
    }

    const { data: assessments, error: aErr } = await query

    if (aErr || !assessments || assessments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun contrôle approuvé à envoyer au client' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Passer les assessments en client_review (on reutilise in_review avec un stage different)
    // On crée une validation client_review pending
    const ids = assessments.map((a) => a.id)

    // Mettre le statut en in_review (le client va le revoir)
    const { error: updateError } = await supabaseAdmin
      .from('control_assessments')
      .update({ status: 'in_review' })
      .in('id', ids)

    if (updateError) {
      console.error('send-to-client update:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'envoi au client' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour le statut de la mission
    await supabaseAdmin
      .from('missions')
      .update({ status: 'client_review' })
      .eq('id', mission_id)

    return new Response(
      JSON.stringify({ success: true, count: ids.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-to-client-review unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
