import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hashSetupToken } from '../_shared/setup-token.ts'
import { setUserPassword } from '../_shared/set-user-password.ts'

/**
 * Edge Function PUBLIQUE : set-password-with-token
 *
 * Pose le mot de passe à partir d'un jeton d'invitation/reset MAISON (voir
 * migration 00238). Non authentifiée (l'utilisateur n'a pas encore de session).
 *
 * Déroulé (sûr) :
 *  1. hash du jeton reçu → recherche d'une ligne NON utilisée et NON expirée ;
 *  2. validation + pose du mot de passe (policy + HIBP + historique) ;
 *  3. SEULEMENT en cas de succès : consommation atomique (used_at) → anti-rejeu.
 *     Un mot de passe refusé (faible/HIBP) ne « brûle » donc pas le lien.
 *
 * Réponse : { ok, email } — l'email permet au front de faire signInWithPassword
 * (session propre). Erreurs génériques (anti-énumération). Le jeton brut n'est
 * jamais journalisé.
 */

interface Body {
  setup_token?: string
  password?: string
}

function json(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const INVALID = 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const body = (await req.json().catch(() => ({}))) as Body
    const rawToken = body.setup_token?.trim()
    const password = body.password
    if (!rawToken || !password) return json({ error: 'Requête invalide' }, 400)

    const hash = await hashSetupToken(rawToken)
    const nowIso = new Date().toISOString()

    // 1. Peek (sans consommer) : jeton non utilisé et non expiré.
    const { data: tok } = await admin
      .from('password_setup_tokens')
      .select('id, user_id')
      .eq('token_hash', hash)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .maybeSingle()
    if (!tok) return json({ error: INVALID }, 400)
    const tokenId = (tok as { id: string }).id
    const userId = (tok as { user_id: string }).user_id

    // 2. Charger le compte cible.
    const { data: u } = await admin.from('users').select('auth_id, email').eq('id', userId).single()
    if (!u) return json({ error: INVALID }, 400)
    const user = u as { auth_id: string; email: string }

    // 3. Valider + poser le mot de passe (le jeton n'est PAS encore consommé :
    //    un mdp refusé n'invalide pas le lien).
    const res = await setUserPassword(admin, user.auth_id, userId, password)
    if (!res.ok) return json({ error: res.error ?? 'Mot de passe refusé', rules: res.rules ?? [] }, res.status ?? 400)

    // 4. Succès → consommation atomique (anti-rejeu).
    await admin.from('password_setup_tokens').update({ used_at: nowIso }).eq('id', tokenId).is('used_at', null)

    return json({ ok: true, email: user.email }, 200)
  } catch (err) {
    console.error('[set-password-with-token] error:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
