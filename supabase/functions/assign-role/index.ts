import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AssignRolePayload {
  user_id: string
  role_id: string
  remove_role_id?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verifier l'authentification
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

    // 2. Identifier l'appelant via le token JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Profil de l'appelant
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('auth_id', caller.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parser le payload
    const body: AssignRolePayload = await req.json()
    const { user_id, role_id, remove_role_id } = body

    if (!user_id || !role_id) {
      return new Response(
        JSON.stringify({ error: 'user_id et role_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Verifier que l'utilisateur cible est dans la meme organisation
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('id', user_id)
      .single()

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetUser.organization_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Verifier que le role existe dans l'organisation
    const { data: role, error: roleError } = await supabaseAdmin
      .from('platform_roles')
      .select('id')
      .eq('id', role_id)
      .eq('organization_id', callerProfile.organization_id)
      .single()

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: 'Rôle invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Supprimer l'ancien role si demande
    if (remove_role_id) {
      const { error: deleteError } = await supabaseAdmin
        .from('user_platform_roles')
        .delete()
        .eq('user_id', user_id)
        .eq('platform_role_id', remove_role_id)

      if (deleteError) {
        console.error('assign-role delete:', deleteError.message)
      }
    }

    // 8. Attribuer le nouveau role
    const { error: insertError } = await supabaseAdmin
      .from('user_platform_roles')
      .upsert(
        {
          user_id,
          platform_role_id: role_id,
          assigned_by: callerProfile.id,
        },
        { onConflict: 'user_id,platform_role_id' }
      )

    if (insertError) {
      console.error('assign-role insert:', insertError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'attribution du rôle' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('assign-role unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
