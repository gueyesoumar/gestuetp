import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

interface ResetPasswordPayload {
  user_id: string
  new_password: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Client service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 2. Authentifier l'appelant cryptographiquement (jamais un décodage JWT maison)
    const auth = await authenticateCaller(supabaseAdmin, req)
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ error: auth.message }),
        { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const callerProfile = auth.profile

    // 3. Exiger la permission de gestion des membres
    if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_manage_members'))) {
      return new Response(
        JSON.stringify({ error: 'Permission can_manage_members requise' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parser et valider le payload
    const payload: ResetPasswordPayload = await req.json()
    const { user_id, new_password } = payload

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'user_id et new_password sont requis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new_password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Vérifier que la cible est dans la même organisation
    const { data: targetProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id, auth_id')
      .eq('id', user_id)
      .single()

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Membre introuvable.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (callerProfile.organization_id !== targetProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez modifier que les membres de votre organisation.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5b. Protection des privilèges : on ne réinitialise pas un compte gérant les
    //     rôles (admin cabinet) sauf si l'appelant dispose lui aussi de ce niveau.
    if (user_id !== callerProfile.id) {
      const targetIsRoleAdmin = await hasCabinetPerm(supabaseAdmin, user_id, 'can_manage_roles')
      if (targetIsRoleAdmin && !(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_manage_roles'))) {
        return new Response(
          JSON.stringify({ error: 'Vous ne pouvez pas réinitialiser le mot de passe d\'un administrateur.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 6. Réinitialiser le mot de passe
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetProfile.auth_id,
      { password: new_password }
    )

    if (updateError) {
      console.error('reset-user-password:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'Impossible de réinitialiser le mot de passe.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('reset-user-password error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
