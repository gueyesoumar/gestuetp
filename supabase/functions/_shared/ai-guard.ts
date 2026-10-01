import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Garde IA centralisé — à appeler AVANT tout envoi de données à un modèle externe.
 *
 * Renvoie false si le cabinet a coupé l'IA (organizations.ai_analysis_enabled = false).
 * Défaut true (valeur par défaut de la colonne). Centralise le court-circuit qui était
 * dupliqué (et absent de la plupart des fonctions exposantes).
 */
export async function isAiEnabled(admin: SupabaseClient, cabinetId: string | null | undefined): Promise<boolean> {
  if (!cabinetId) return true
  // Cast : friction de génériques supabase-js entre modules (idiome du repo, cf. client-context.ts).
  const { data } = await (admin
    .from('organizations')
    .select('ai_analysis_enabled')
    .eq('id', cabinetId)
    .maybeSingle() as unknown as Promise<{ data: { ai_analysis_enabled?: boolean } | null }>)
  return data?.ai_analysis_enabled ?? true
}

/** Motif de court-circuit renvoyé au frontend (qui affiche un message « IA désactivée »). */
export const AI_DISABLED_REASON = 'cabinet_ai_disabled'
