import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validatePassword, hashPassword, isPasswordReused, type PasswordPolicy } from '../_shared/password-policy.ts'

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

    const pol = policy as unknown as PasswordPolicy
    const rules = await validatePassword(password, pol)
    if (rules.length > 0) {
      return json({ error: 'Le mot de passe ne respecte pas la politique de sécurité', rules }, 422)
    }

    // Profil applicatif (pour l'historique, clé public.users.id).
    const { data: profile } = await admin.from('users').select('id').eq('auth_id', user.id).single()
    const profileId = (profile as { id: string } | null)?.id ?? null

    // Historique de non-réutilisation (si activé).
    if (pol.history_count > 0 && profileId) {
      const { data: hist } = await admin.from('password_history')
        .select('password_hash').eq('user_id', profileId)
        .order('created_at', { ascending: false }).limit(pol.history_count)
      const hashes = (hist ?? []).map((h) => (h as { password_hash: string }).password_hash)
      if (await isPasswordReused(password, hashes)) {
        return json({ error: 'Le mot de passe ne respecte pas la politique de sécurité',
          rules: [`Déjà utilisé parmi vos ${pol.history_count} derniers mots de passe`] }, 422)
      }
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password })
    if (updateError) {
      // GoTrue applique aussi son propre plancher (longueur/HIBP). Message technique
      // loggé côté serveur uniquement ; l'utilisateur reçoit un message générique.
      console.error('[set-password] updateUser:', updateError.message)
      return json({ error: 'Impossible de définir le mot de passe. Réessayez avec un autre mot de passe.' }, 400)
    }

    // Traçabilité pour la rotation.
    await admin.from('users').update({ password_changed_at: new Date().toISOString() }).eq('auth_id', user.id)

    // Historique : enregistrer le hash + élaguer aux N derniers.
    if (pol.history_count > 0 && profileId) {
      await admin.from('password_history').insert({ user_id: profileId, password_hash: await hashPassword(password) })
      const { data: extra } = await admin.from('password_history')
        .select('id').eq('user_id', profileId)
        .order('created_at', { ascending: false }).range(pol.history_count, 1000)
      const ids = (extra ?? []).map((e) => (e as { id: string }).id)
      if (ids.length > 0) await admin.from('password_history').delete().in('id', ids)
    }

    return json({ ok: true }, 200)
  } catch (err) {
    console.error('[set-password] error:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
