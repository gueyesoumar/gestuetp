import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'
import { validatePassword, hashPassword, isPasswordReused, type PasswordPolicy } from '../_shared/password-policy.ts'

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

    // Valider contre la politique plateforme (longueur, complexité, interdits, HIBP).
    const { data: policy } = await supabaseAdmin
      .from('platform_password_policy').select('*').eq('id', 1).single()
    if (policy) {
      const pol = policy as unknown as PasswordPolicy
      const rules = await validatePassword(new_password, pol)
      if (rules.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Le mot de passe ne respecte pas la politique de sécurité', rules }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (pol.history_count > 0) {
        const { data: hist } = await supabaseAdmin.from('password_history')
          .select('password_hash').eq('user_id', user_id)
          .order('created_at', { ascending: false }).limit(pol.history_count)
        const hashes = (hist ?? []).map((h) => (h as { password_hash: string }).password_hash)
        if (await isPasswordReused(new_password, hashes)) {
          return new Response(
            JSON.stringify({ error: 'Le mot de passe ne respecte pas la politique de sécurité',
              rules: [`Déjà utilisé parmi les ${pol.history_count} derniers mots de passe`] }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
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

    // Traçabilité pour la rotation.
    await supabaseAdmin.from('users')
      .update({ password_changed_at: new Date().toISOString() })
      .eq('id', user_id)

    // Historique : enregistrer le hash + élaguer aux N derniers.
    const histN = policy ? (policy as unknown as PasswordPolicy).history_count : 0
    if (histN > 0) {
      await supabaseAdmin.from('password_history')
        .insert({ user_id, password_hash: await hashPassword(new_password) })
      const { data: extra } = await supabaseAdmin.from('password_history')
        .select('id').eq('user_id', user_id)
        .order('created_at', { ascending: false }).range(histN, 1000)
      const ids = (extra ?? []).map((e) => (e as { id: string }).id)
      if (ids.length > 0) await supabaseAdmin.from('password_history').delete().in('id', ids)
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
