import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validatePassword, type PasswordPolicy } from '../_shared/password-policy.ts'

/**
 * Edge Function : set-password
 *
 * Point de passage UNIQUE pour poser/changer le mot de passe d'un utilisateur
 * (remplace les appels client `supabase.auth.updateUser({ password })`). Valide
 * la valeur contre la politique plateforme (longueur, complexité, interdits, HIBP)
 * AVANT de la poser via service_role. L'appelant agit sur SON PROPRE compte
 * (session standard ou session recovery en AAL1 — first set / reset).
 */

function json(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!token) return json({ error: 'Non autorisé' }, 401)

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return json({ error: 'Non autorisé' }, 401)

    const body = await req.json().catch(() => null) as { password?: string } | null
    const password = body?.password
    if (!password || typeof password !== 'string') {
      return json({ error: 'Mot de passe requis' }, 400)
    }

    // Charger la politique (singleton). Défauts sûrs si absente.
    const { data: policy, error: policyError } = await admin
      .from('platform_password_policy')
      .select('*')
      .eq('id', 1)
      .single()
    if (policyError || !policy) {
      console.error('[set-password] policy load:', policyError?.message ?? 'introuvable')
      return json({ error: 'Configuration indisponible' }, 500)
    }

    const rules = await validatePassword(password, policy as unknown as PasswordPolicy)
    if (rules.length > 0) {
      return json({ error: 'Le mot de passe ne respecte pas la politique de sécurité', rules }, 422)
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password })
    if (updateError) {
      // GoTrue applique aussi son propre plancher (longueur/HIBP). Message technique
      // loggé côté serveur uniquement ; l'utilisateur reçoit un message générique.
      console.error('[set-password] updateUser:', updateError.message)
      return json({ error: 'Impossible de définir le mot de passe. Réessayez avec un autre mot de passe.' }, 400)
    }

    // Traçabilité pour la rotation (Phase 2).
    await admin.from('users').update({ password_changed_at: new Date().toISOString() }).eq('auth_id', user.id)

    return json({ ok: true }, 200)
  } catch (err) {
    console.error('[set-password] error:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
