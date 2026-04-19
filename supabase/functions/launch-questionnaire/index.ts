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

    // 2. Parser le payload
    const { mission_id } = await req.json()
    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Charger la mission
    const { data: mission, error: mErr } = await supabaseAdmin
      .from('missions')
      .select('id, framework_id, cabinet_id')
      .eq('id', mission_id)
      .single()

    if (mErr || !mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verifier qu'il n'existe pas deja une instance
    const { data: existing } = await supabaseAdmin
      .from('questionnaire_instances')
      .select('id')
      .eq('mission_id', mission_id)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Le questionnaire a déjà été envoyé pour cette mission' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Trouver le template questionnaire du referentiel
    const { data: template, error: tErr } = await supabaseAdmin
      .from('questionnaire_templates')
      .select('id, name, description, version')
      .eq('framework_id', mission.framework_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (tErr || !template) {
      return new Response(
        JSON.stringify({ error: 'Aucun questionnaire disponible pour ce référentiel' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Charger les questions du template
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('template_id', template.id)
      .order('sort_order')

    if (qErr) {
      console.error('launch-questionnaire questions:', qErr.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors du chargement des questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Creer le snapshot (copie figee du template + questions)
    const snapshot = {
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
      },
      questions: questions ?? [],
      created_at: new Date().toISOString(),
    }

    // 8. Inserer l'instance
    const { data: instance, error: iErr } = await supabaseAdmin
      .from('questionnaire_instances')
      .insert({
        mission_id,
        template_id: template.id,
        snapshot,
      })
      .select('id')
      .single()

    if (iErr || !instance) {
      console.error('launch-questionnaire insert:', iErr?.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du questionnaire' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Mettre a jour le statut de la mission vers 'scoping'
    await supabaseAdmin
      .from('missions')
      .update({ status: 'scoping' })
      .eq('id', mission_id)

    return new Response(
      JSON.stringify({ success: true, instance_id: instance.id }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('launch-questionnaire unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
