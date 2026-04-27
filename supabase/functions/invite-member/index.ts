import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

interface InvitePayload {
  email: string
  first_name: string
  last_name: string
  role_id: string
  organization_id: string
}

Deno.serve(async (req) => {
  // CORS preflight
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

    // Client service_role (pour les operations privilegiees + verification auth)
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

    // 3. Recuperer le profil de l'appelant
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

    // 4. Parser et valider le payload
    const body: InvitePayload = await req.json()
    const { email, first_name, last_name, role_id, organization_id } = body

    if (!email || !first_name || !last_name || !role_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Verifier que l'appelant appartient a la meme organisation
    if (callerProfile.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit à cette organisation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5.bis Permission cabinet — can_manage_members obligatoire
    if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_manage_members'))) {
      return new Response(
        JSON.stringify({ error: 'Permission can_manage_members requise' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Verifier que le role demande existe dans l'organisation
    const { data: role, error: roleError } = await supabaseAdmin
      .from('platform_roles')
      .select('id')
      .eq('id', role_id)
      .eq('organization_id', organization_id)
      .single()

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: 'Rôle invalide pour cette organisation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Creer l'utilisateur dans Supabase Auth
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    })

    if (createError) {
      const message = createError.message.includes('already been registered')
        ? 'Cet email est déjà utilisé'
        : 'Erreur lors de la création du compte'
      console.error('invite-member createUser:', createError.message)
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Creer le profil dans public.users
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authUser.user.id,
        organization_id,
        email,
        first_name,
        last_name,
      })
      .select('id')
      .single()

    if (userError) {
      console.error('invite-member insert user:', userError.message)
      // Rollback: supprimer l'utilisateur auth cree
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du profil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Attribuer le role
    const { error: roleAssignError } = await supabaseAdmin
      .from('user_platform_roles')
      .insert({
        user_id: newUser.id,
        platform_role_id: role_id,
        assigned_by: callerProfile.id,
      })

    if (roleAssignError) {
      console.error('invite-member assign role:', roleAssignError.message)
      // Le user est cree mais sans role — pas critique, on continue
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.id }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('invite-member unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
