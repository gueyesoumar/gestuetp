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
      .select('id, organization_id')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parser le payload
    const { mission_id, evidence_catalog_ids } = await req.json() as {
      mission_id: string
      evidence_catalog_ids: string[]
    }

    if (!mission_id || !evidence_catalog_ids || evidence_catalog_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'mission_id et evidence_catalog_ids requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verifier la mission
    const { data: mission } = await supabaseAdmin
      .from('missions')
      .select('id, cabinet_id')
      .eq('id', mission_id)
      .single()

    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (mission.cabinet_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Inserer les demandes (ignorer les doublons)
    const entries = evidence_catalog_ids.map((ecId: string) => ({
      mission_id,
      evidence_catalog_id: ecId,
      requested_by: callerProfile.id,
      status: 'pending',
    }))

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('mission_evidence_requests')
      .upsert(entries, { onConflict: 'mission_id,evidence_catalog_id' })
      .select('id')

    if (insertError) {
      console.error('request-evidence insert:', insertError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création des demandes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted?.length ?? 0 }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('request-evidence unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
