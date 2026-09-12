import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hashSetupToken } from '../_shared/setup-token.ts'
import { validateUserPassword, applyUserPassword } from '../_shared/set-user-password.ts'

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
      .select('user_id')
      .eq('token_hash', hash)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .maybeSingle()
    if (!tok) return json({ error: INVALID }, 400)
    const userId = (tok as { user_id: string }).user_id

    // 2. Charger le compte cible (refuser si désactivé — F3).
    const { data: u } = await admin.from('users').select('auth_id, email, is_active').eq('id', userId).single()
    const user = u as { auth_id: string; email: string; is_active: boolean } | null
    if (!user || !user.is_active) return json({ error: INVALID }, 400)

    // 3. Valider AVANT de consommer (un mdp refusé ne « brûle » pas le lien).
    const v = await validateUserPassword(admin, userId, password)
    if (!v.ok || !v.policy) return json({ error: v.error ?? 'Mot de passe refusé', rules: v.rules ?? [] }, v.status ?? 400)

    // 4. Consommation ATOMIQUE anti-rejeu : on ne pose le mdp que si CE process
    //    remporte le jeton (used_at passe de NULL → maintenant). Une soumission
    //    concurrente / un rejeu obtient 0 ligne → INVALID.
    const { data: claimed, error: claimErr } = await admin
      .from('password_setup_tokens')
      .update({ used_at: nowIso })
      .eq('token_hash', hash)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .select('user_id')
      .maybeSingle()
    if (claimErr) { console.error('[set-password-with-token] claim:', claimErr.message); return json({ error: 'Erreur interne' }, 500) }
    if (!claimed) return json({ error: INVALID }, 400)

    // 5. Appliquer le mot de passe (déjà validé).
    const applied = await applyUserPassword(admin, user.auth_id, userId, password, v.policy)
    if (!applied.ok) return json({ error: applied.error ?? 'Mot de passe refusé' }, applied.status ?? 400)

    return json({ ok: true, email: user.email }, 200)
  } catch (err) {
    console.error('[set-password-with-token] error:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
