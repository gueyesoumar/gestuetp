import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Auth
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')
    let callerId: string | null = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (!authError && user) callerId = user.id
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users').select('id, organization_id').eq('auth_id', callerId).single()
    if (!callerProfile) {
      return new Response(JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Permission cabinet — can_assign_team requise pour add ET remove
    if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_assign_team'))) {
      return new Response(JSON.stringify({ error: 'Permission can_assign_team requise' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action, mission_id, user_id, role, member_id } = body

    if (!mission_id) {
      return new Response(JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify mission belongs to caller's cabinet
    const { data: mission } = await supabaseAdmin
      .from('missions').select('id, cabinet_id').eq('id', mission_id).single()
    if (!mission || mission.cabinet_id !== callerProfile.organization_id) {
      return new Response(JSON.stringify({ error: 'Accès interdit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'add') {
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: 'user_id et role requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Si on ajoute quelqu'un comme lead_auditor : caller doit avoir
      // can_designate_lead (sauf si c'est lui-même) et le user doit avoir can_be_lead
      if (role === 'lead_auditor') {
        if (user_id !== callerProfile.id
            && !(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_designate_lead'))) {
          return new Response(JSON.stringify({ error: 'Permission can_designate_lead requise' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (!(await hasCabinetPerm(supabaseAdmin, user_id, 'can_be_lead'))) {
          return new Response(JSON.stringify({ error: 'Cet utilisateur n\'a pas la permission can_be_lead' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      const { error: insertError } = await supabaseAdmin
        .from('mission_members')
        .insert({ mission_id, user_id, role })

      if (insertError) {
        console.error('manage-team add:', insertError.message)
        return new Response(JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ success: true }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'remove') {
      if (!member_id) {
        return new Response(JSON.stringify({ error: 'member_id requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { error: deleteError } = await supabaseAdmin
        .from('mission_members')
        .delete()
        .eq('id', member_id)

      if (deleteError) {
        console.error('manage-team remove:', deleteError.message)
        return new Response(JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Action invalide (add ou remove)' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('manage-team unexpected:', err)
    return new Response(JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
