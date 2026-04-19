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

    // 1. Verifier l'appelant
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
    const { assessment_id } = await req.json()
    if (!assessment_id) {
      return new Response(
        JSON.stringify({ error: 'assessment_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Charger l'assessment
    const { data: assessment, error: aErr } = await supabaseAdmin
      .from('control_assessments')
      .select('id, auditor_id, mission_id, status, findings')
      .eq('id', assessment_id)
      .single()

    if (aErr || !assessment) {
      return new Response(
        JSON.stringify({ error: 'Assessment introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verifier que l'appelant est l'auditeur
    if (assessment.auditor_id !== callerProfile.id) {
      return new Response(
        JSON.stringify({ error: 'Seul l\'auditeur affecté peut soumettre' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Verifier que le statut permet la soumission
    if (assessment.status !== 'draft' && assessment.status !== 'rejected') {
      return new Response(
        JSON.stringify({ error: 'Ce contrôle a déjà été soumis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Verifier que les constats sont remplis
    if (!assessment.findings || assessment.findings.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Les constats doivent être renseignés avant soumission' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Mettre a jour le statut
    const { error: updateError } = await supabaseAdmin
      .from('control_assessments')
      .update({ status: 'submitted' })
      .eq('id', assessment_id)

    if (updateError) {
      console.error('submit-assessment update:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la soumission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Creer une entree dans assessment_validations
    const { error: valError } = await supabaseAdmin
      .from('assessment_validations')
      .insert({
        assessment_id,
        stage: 'auditor_submitted',
        decision: 'approved',
        comment: null,
        validated_by: callerProfile.id,
      })

    if (valError) {
      console.error('submit-assessment validation:', valError.message)
    }

    // 9. Mettre a jour le statut de la mission vers fieldwork si necessaire
    await supabaseAdmin
      .from('missions')
      .update({ status: 'fieldwork' })
      .eq('id', assessment.mission_id)
      .in('status', ['initialization', 'scoping', 'planning'])

    // 10. Auto-transition: si TOUS les assessments sont soumis → passer en internal_review
    const { data: allAssessments } = await supabaseAdmin
      .from('control_assessments')
      .select('status')
      .eq('mission_id', assessment.mission_id)

    if (allAssessments && allAssessments.length > 0) {
      const allSubmitted = allAssessments.every(
        (a: { status: string }) => a.status === 'submitted' || a.status === 'in_review' || a.status === 'approved'
      )
      if (allSubmitted) {
        await supabaseAdmin
          .from('missions')
          .update({ status: 'internal_review' })
          .eq('id', assessment.mission_id)
          .eq('status', 'fieldwork')
      }
    }

    return new Response(
      JSON.stringify({ success: true, auto_review: allAssessments?.every((a: { status: string }) => a.status !== 'draft' && a.status !== 'rejected') ?? false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('submit-assessment unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
