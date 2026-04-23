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

    // 1. Identifier l'appelant
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

    // 2. Parser le payload
    const { assessment_id, decision, comment } = await req.json() as {
      assessment_id: string
      decision: 'approved' | 'rejected'
      comment: string | null
    }

    if (!assessment_id || !decision) {
      return new Response(
        JSON.stringify({ error: 'assessment_id et decision requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (decision === 'rejected' && (!comment || comment.trim().length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Un commentaire est obligatoire pour un rejet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Charger l'assessment et la mission
    const { data: assessment, error: aErr } = await supabaseAdmin
      .from('control_assessments')
      .select('id, mission_id, status')
      .eq('id', assessment_id)
      .single()

    if (aErr || !assessment) {
      return new Response(
        JSON.stringify({ error: 'Assessment introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: mission } = await supabaseAdmin
      .from('missions')
      .select('id, lead_auditor_id, associate_id')
      .eq('id', assessment.mission_id)
      .single()

    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Determiner le role du reviewer et le stage
    const isLead = mission.lead_auditor_id === callerProfile.id
    const isAssociate = mission.associate_id === callerProfile.id

    if (!isLead && !isAssociate) {
      return new Response(
        JSON.stringify({ error: 'Seuls le chef de mission et l\'associ\u00e9 peuvent valider' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4b. Check if the reviewer is the one who submitted — prevent self-review
    const { data: assessmentFull } = await supabaseAdmin
      .from('control_assessments')
      .select('auditor_id')
      .eq('id', assessment_id)
      .single()

    if (isLead && assessmentFull?.auditor_id === callerProfile.id && assessment.status === 'submitted') {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez pas valider un contr\u00f4le que vous avez vous-m\u00eame soumis. Ce constat doit \u00eatre valid\u00e9 par l\'associ\u00e9.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Verifier la coherence du statut
    let stage: 'lead_review' | 'associate_review'
    let newStatus: string

    if (isLead && assessment.status === 'submitted') {
      // Lead reviews auditor's work (not his own — checked above)
      stage = 'lead_review'
      if (decision === 'approved') {
        newStatus = mission.associate_id ? 'in_review' : 'approved'
      } else {
        newStatus = 'rejected'
      }
    } else if (isAssociate && assessment.status === 'in_review') {
      // Associate reviews after lead approval (or after lead's own submission skip)
      stage = 'associate_review'
      newStatus = decision === 'approved' ? 'approved' : 'rejected'
    } else if (isAssociate && assessment.status === 'submitted' && mission.lead_auditor_id === mission.associate_id) {
      // Edge case: associate is also lead (should be avoided but handle gracefully)
      stage = 'associate_review'
      newStatus = decision === 'approved' ? 'approved' : 'rejected'
    } else {
      return new Response(
        JSON.stringify({ error: 'Ce contr\u00f4le n\'est pas en attente de votre validation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Mettre a jour le statut
    const { error: updateError } = await supabaseAdmin
      .from('control_assessments')
      .update({ status: newStatus })
      .eq('id', assessment_id)

    if (updateError) {
      console.error('review-assessment update:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la validation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Creer l'entree de validation
    const { error: valError } = await supabaseAdmin
      .from('assessment_validations')
      .insert({
        assessment_id,
        stage,
        decision,
        comment: comment || null,
        validated_by: callerProfile.id,
      })

    if (valError) {
      console.error('review-assessment validation:', valError.message)
    }

    // 8. Verifier si tous les assessments sont approuves → passer la mission en internal_review
    if (decision === 'approved') {
      const { data: allAssessments } = await supabaseAdmin
        .from('control_assessments')
        .select('status')
        .eq('mission_id', assessment.mission_id)

      const allApproved = allAssessments?.every((a) => a.status === 'approved')

      if (allApproved) {
        await supabaseAdmin
          .from('missions')
          .update({ status: 'internal_review' })
          .eq('id', assessment.mission_id)
      } else {
        // S'assurer que la mission est au moins en fieldwork
        await supabaseAdmin
          .from('missions')
          .update({ status: 'fieldwork' })
          .eq('id', assessment.mission_id)
          .in('status', ['initialization', 'scoping', 'planning'])
      }
    }

    return new Response(
      JSON.stringify({ success: true, new_status: newStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('review-assessment unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
