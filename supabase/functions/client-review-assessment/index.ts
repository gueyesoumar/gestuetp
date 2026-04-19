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
      .select('id, organization_id')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parser le payload
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

    // Charger l'assessment et la mission
    const { data: assessment } = await supabaseAdmin
      .from('control_assessments')
      .select('id, mission_id, status')
      .eq('id', assessment_id)
      .single()

    if (!assessment) {
      return new Response(
        JSON.stringify({ error: 'Assessment introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verifier que l'appelant est du côté client de la mission
    const { data: mission } = await supabaseAdmin
      .from('missions')
      .select('id, client_id')
      .eq('id', assessment.mission_id)
      .single()

    if (!mission || mission.client_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit — réservé au client de la mission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verifier que le statut permet la revue client
    if (assessment.status !== 'in_review') {
      return new Response(
        JSON.stringify({ error: 'Ce contrôle n\'est pas en attente de validation client' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Appliquer la decision
    let newStatus: string
    if (decision === 'approved') {
      newStatus = 'approved'
    } else {
      // Rejet client → retour en draft pour l'auditeur (Phase 4)
      newStatus = 'rejected'
    }

    const { error: updateError } = await supabaseAdmin
      .from('control_assessments')
      .update({ status: newStatus })
      .eq('id', assessment_id)

    if (updateError) {
      console.error('client-review update:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la validation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Créer l'entrée de validation
    await supabaseAdmin
      .from('assessment_validations')
      .insert({
        assessment_id,
        stage: 'client_review',
        decision,
        comment: comment || null,
        validated_by: callerProfile.id,
      })

    // Si rejet, repasser le statut en draft pour que l'auditeur puisse corriger
    if (decision === 'rejected') {
      await supabaseAdmin
        .from('control_assessments')
        .update({ status: 'draft' })
        .eq('id', assessment_id)
    }

    return new Response(
      JSON.stringify({ success: true, new_status: decision === 'approved' ? 'approved' : 'draft' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('client-review unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
