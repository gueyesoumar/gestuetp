import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ResetPasswordPayload {
  user_id: string
  new_password: string
}

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Vérifier que l'appelant est authentifié
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Vérifier que l'appelant et la cible sont dans la même organisation
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_id', caller.id)
      .single()

    const { data: targetProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id, auth_id')
      .eq('id', user_id)
      .single()

    if (!callerProfile || !targetProfile || callerProfile.organization_id !== targetProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez modifier que les membres de votre organisation.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Réinitialiser le mot de passe via l'API admin
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
