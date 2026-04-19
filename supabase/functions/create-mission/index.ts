import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CreateMissionPayload {
  name: string
  description: string
  cabinet_client_id: string
  framework_id: string
  lead_auditor_id: string
  associate_id: string
  start_date: string
  end_date: string
  member_ids: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Identifier l'appelant via le JWT (Authorization OU x-auth-token)
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')

    let callerId: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (!authError && user) {
        callerId = user.id
      }
    }

    // Fallback: extraire l'user depuis le context Supabase (fonctions hosted)
    if (!callerId) {
      // Sur Supabase hosted, le user_id est injecte dans le header x-supabase-auth
      const supabaseAuth = req.headers.get('x-supabase-auth')
      if (supabaseAuth) {
        try {
          const parsed = JSON.parse(supabaseAuth)
          callerId = parsed.sub ?? parsed.user_id ?? null
        } catch { /* */ }
      }
    }

    if (!callerId) {
      // Dernier recours : creer un client avec la cle anon + le JWT du user
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
      if (anonKey && authHeader) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await userClient.auth.getUser()
        if (user) callerId = user.id
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

    // 3. Parser le payload
    const body: CreateMissionPayload = await req.json()
    const {
      name, description, cabinet_client_id, framework_id,
      lead_auditor_id, associate_id, start_date, end_date, member_ids,
    } = body

    if (!name || !cabinet_client_id || !framework_id || !lead_auditor_id || !associate_id || !start_date || !end_date) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Charger la fiche client du cabinet
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

    // Verifier que la fiche appartient au cabinet de l'appelant
    if (cabinetClient.cabinet_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit à ce client' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Resoudre ou creer l'organisation client (deduplication)
    let clientOrgId = cabinetClient.client_org_id

    if (!clientOrgId) {
      // Tenter la deduplication par registration_number
      if (cabinetClient.client_registration_number) {
        const { data: existing } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .contains('types', ['client'])
          .eq('registration_number', cabinetClient.client_registration_number)
          .limit(1)

        if (existing && existing.length > 0) {
          clientOrgId = existing[0].id
        }
      }

      // Si toujours pas trouve, creer l'organisation
      if (!clientOrgId) {
        const slug = cabinetClient.client_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          + '-' + Date.now().toString(36)

        const { data: newOrg, error: orgError } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: cabinetClient.client_name,
            slug,
            types: ['client'],
          })
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

      // Mettre a jour la fiche cabinet_clients avec l'org_id
      await supabaseAdmin
        .from('cabinet_clients')
        .update({ client_org_id: clientOrgId })
        .eq('id', cabinet_client_id)
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

    // 7. Creer la mission
    const { data: mission, error: missionError } = await supabaseAdmin
      .from('missions')
      .insert({
        name,
        description: description || null,
        cabinet_id: callerProfile.organization_id,
        client_id: clientOrgId,
        framework_id,
        lead_auditor_id,
        associate_id,
        start_date,
        end_date,
        status: 'initialization',
      })
      .select('id')
      .single()

    if (missionError || !mission) {
      console.error('create-mission insert:', missionError?.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la mission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Ajouter les membres de la mission
    const memberEntries = (member_ids ?? []).map((userId: string) => {
      let role: 'associate' | 'lead_auditor' | 'auditor' = 'auditor'
      if (userId === associate_id) role = 'associate'
      else if (userId === lead_auditor_id) role = 'lead_auditor'

      return {
        mission_id: mission.id,
        user_id: userId,
        role,
      }
    })

    if (memberEntries.length > 0) {
      const { error: membersError } = await supabaseAdmin
        .from('mission_members')
        .insert(memberEntries)

      if (membersError) {
        console.error('create-mission members:', membersError.message)
      }
    }

    return new Response(
      JSON.stringify({ success: true, mission_id: mission.id }),
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
