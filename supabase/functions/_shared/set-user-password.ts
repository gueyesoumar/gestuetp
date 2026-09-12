import { validatePassword, hashPassword, isPasswordReused, type PasswordPolicy } from './password-policy.ts'

/**
 * Pose (ou change) le mot de passe d'un utilisateur donné, en appliquant la
 * politique plateforme (longueur, complexité, interdits, HIBP) + l'historique de
 * non-réutilisation. Partagé entre set-password (session) et
 * set-password-with-token (jeton d'invitation maison).
 *
 * `validateUserPassword` / `applyUserPassword` sont exposées séparément pour
 * permettre au flux jeton de VALIDER avant de consommer le jeton atomiquement,
 * puis d'APPLIQUER — sans qu'un mot de passe refusé « brûle » le lien, et sans
 * fenêtre de rejeu. Ne fait AUCUNE vérification d'identité.
 */
export interface SetPasswordResult {
  ok: boolean
  error?: string
  rules?: string[]
  status?: number
  policy?: PasswordPolicy
}

// deno-lint-ignore no-explicit-any
export async function validateUserPassword(admin: any, profileId: string | null, password: string): Promise<SetPasswordResult> {
  if (!password || typeof password !== 'string') {
    return { ok: false, error: 'Mot de passe requis', status: 400 }
  }

  const { data: policy, error: policyError } = await admin
    .from('platform_password_policy').select('*').eq('id', 1).single()
  if (policyError || !policy) {
    console.error('[set-user-password] policy load:', policyError?.message ?? 'introuvable')
    return { ok: false, error: 'Configuration indisponible', status: 500 }
  }
  const pol = policy as unknown as PasswordPolicy

  const rules = await validatePassword(password, pol)
  if (rules.length > 0) {
    return { ok: false, error: 'Le mot de passe ne respecte pas la politique de sécurité', rules, status: 422 }
  }

  if (pol.history_count > 0 && profileId) {
    const { data: hist } = await admin.from('password_history')
      .select('password_hash').eq('user_id', profileId)
      .order('created_at', { ascending: false }).limit(pol.history_count)
    const hashes = (hist ?? []).map((h: { password_hash: string }) => h.password_hash)
    if (await isPasswordReused(password, hashes)) {
      return { ok: false, error: 'Le mot de passe ne respecte pas la politique de sécurité',
        rules: [`Déjà utilisé parmi vos ${pol.history_count} derniers mots de passe`], status: 422 }
    }
  }

  return { ok: true, policy: pol }
}

/** Applique le mot de passe (déjà validé). `policy` fournie pour l'historique. */
// deno-lint-ignore no-explicit-any
export async function applyUserPassword(admin: any, authId: string, profileId: string | null, password: string, policy: PasswordPolicy): Promise<SetPasswordResult> {
  const { error: updateError } = await admin.auth.admin.updateUserById(authId, { password })
  if (updateError) {
    console.error('[set-user-password] updateUser:', updateError.message)
    return { ok: false, error: 'Impossible de définir le mot de passe. Réessayez avec un autre mot de passe.', status: 400 }
  }

  await admin.from('users').update({ password_changed_at: new Date().toISOString() }).eq('auth_id', authId)

  if (policy.history_count > 0 && profileId) {
    await admin.from('password_history').insert({ user_id: profileId, password_hash: await hashPassword(password) })
    const { data: extra } = await admin.from('password_history')
      .select('id').eq('user_id', profileId)
      .order('created_at', { ascending: false }).range(policy.history_count, 1000)
    const ids = (extra ?? []).map((e: { id: string }) => e.id)
    if (ids.length > 0) await admin.from('password_history').delete().in('id', ids)
  }

  return { ok: true }
}

/** Valide + applique en une passe (flux session set-password). */
// deno-lint-ignore no-explicit-any
export async function setUserPassword(admin: any, authId: string, profileId: string | null, password: string): Promise<SetPasswordResult> {
  const v = await validateUserPassword(admin, profileId, password)
  if (!v.ok || !v.policy) return v
  return applyUserPassword(admin, authId, profileId, password, v.policy)
}
