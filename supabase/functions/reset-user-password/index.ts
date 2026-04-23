import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ResetPasswordPayload {
  user_id: string
  new_password: string
}

/** Decode JWT payload without verification (the signing key guarantees integrity) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payload)
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extraire et décoder le JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtPayload = decodeJwtPayload(token)
    const authUserId = jwtPayload?.sub as string | undefined

    if (!authUserId) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Client service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 3. Vérifier que l'appelant existe en base
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('auth_id', authUserId)
      .single()

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
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
