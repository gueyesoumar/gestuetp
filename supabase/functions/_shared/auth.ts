// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Helpers d'autorisation partages pour les Edge Functions.
 *
 * Toute fonction qui mute ou lit des donnees tenant via le client service_role
 * (qui contourne la RLS) DOIT :
 *   1. authentifier l'appelant cryptographiquement (auth.getUser, jamais un
 *      decodage de JWT maison) ;
 *   2. resoudre son profil public.users + verifier is_active ;
 *   3. cloisonner l'acces : la ressource visee doit appartenir au cabinet de
 *      l'appelant (organization_id === ressource.cabinet_id).
 *
 * Ces helpers centralisent (1)+(2) et fournissent une assertion de cloisonnement.
 */

export interface CallerProfile {
  id: string
  organization_id: string
  is_active: boolean
  role: 'auditor' | 'client'
}

export type AuthOutcome =
  | { ok: true; authUserId: string; profile: CallerProfile }
  | { ok: false; status: number; message: string }

/**
 * Authentifie l'appelant a partir du header Authorization, resout son profil
 * public.users et verifie qu'il est actif.
 *
 * Retourne une union discriminee : la fonction appelante formate sa propre
 * Response a partir de { status, message } pour rester coherente avec son style.
 *
 *   const auth = await authenticateCaller(admin, req)
 *   if (!auth.ok) return jsonResponse({ error: auth.message }, auth.status)
 *   const caller = auth.profile
 */
/**
 * Lit le claim `aal` du JWT (déjà validé cryptographiquement par getUser).
 * Décodage du payload uniquement — aucune vérification de signature ici.
 */
function readAal(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json?.aal === 'string' ? json.aal : null
  } catch { return null }
}

export async function authenticateCaller(
  admin: SupabaseClient,
  req: Request,
): Promise<AuthOutcome> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { ok: false, status: 401, message: 'Non autorisé' }

  const token = authHeader.replace('Bearer ', '').trim()
  const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
  if (authError || !caller) return { ok: false, status: 401, message: 'Non autorisé' }

  // MFA obligatoire (AAL2) — activé via l'interrupteur MFA_ENFORCE une fois les
  // comptes enrôlés (sinon lockout massif). Couvre toute la surface d'écriture
  // edge, y compris un appel direct à l'API avec un jeton AAL1.
  if (Deno.env.get('MFA_ENFORCE') === 'on' && readAal(token) !== 'aal2') {
    return { ok: false, status: 401, message: 'Authentification à deux facteurs requise' }
  }

  const { data: profile } = await (admin
    .from('users') as any)
    .select('id, organization_id, is_active, role')
    .eq('auth_id', caller.id)
    .single()

  if (!profile) return { ok: false, status: 403, message: 'Profil introuvable' }
  const p = profile as CallerProfile
  if (!p.is_active) return { ok: false, status: 403, message: 'Compte désactivé' }

  return { ok: true, authUserId: caller.id, profile: p }
}

/**
 * Verifie que la mission appartient au cabinet de l'appelant.
 * A appeler APRES authenticateCaller et APRES avoir charge la mission
 * (qui fournit cabinet_id), AVANT toute lecture/ecriture sensible.
 *
 *   if (!sameCabinet(caller, mission.cabinet_id)) {
 *     return jsonResponse({ error: ACCESS_DENIED }, 403)
 *   }
 */
export function sameCabinet(profile: CallerProfile, cabinetId: string | null | undefined): boolean {
  return !!cabinetId && profile.organization_id === cabinetId
}

/** Message generique de refus de cloisonnement (ne pas exposer de detail technique). */
export const ACCESS_DENIED = "Cette ressource n'appartient pas à votre cabinet"
