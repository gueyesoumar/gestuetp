// Résolveur de vocabulaire CÔTÉ SERVEUR (RFC 0002, lot « vocab serveur »).
// Miroir de useVocab pour les Edge Functions (emails) : les templates ne peuvent
// pas utiliser le hook front. On résout le vocab de l'org ÉMETTRICE (le cabinet /
// régulateur de la mission), pas du destinataire.
//
// Périmètre : les termes de RÔLE, naturellement singuliers et de forme identique
// front/email (provider_term, auditor_term). Le mission_term reste le défaut par
// édition (le mission_term du front est un libellé de nav pluriel, forme différente).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface OrgVocab {
  providerTerm: string // cabinet / régulateur
  auditorTerm: string // auditeur / contrôleur
  missionTerm: string // mission / contrôle (singulier, pour les emails)
}

const DEFAULTS: Record<'comply' | 'regul', OrgVocab> = {
  comply: { providerTerm: 'cabinet', auditorTerm: 'auditeur', missionTerm: 'mission' },
  regul: { providerTerm: 'régulateur', auditorTerm: 'contrôleur', missionTerm: 'contrôle' },
}

/** Article défini masculin avec élision : « l'auditeur » / « le contrôleur ». */
export function leElision(term: string): string {
  return /^[aeiouyéèêàâîïôûh]/i.test(term) ? "l'" : 'le '
}

/** Résout le vocab de l'org (défauts par édition + overrides organization_vocab). */
export async function resolveOrgVocab(admin: SupabaseClient, orgId: string): Promise<OrgVocab> {
  const { data: org } = await admin.from('organizations').select('edition').eq('id', orgId).single()
  const base = DEFAULTS[(org as { edition?: string } | null)?.edition === 'regul' ? 'regul' : 'comply']
  const { data: rows } = await admin.from('organization_vocab').select('key, value').eq('org_id', orgId)
  const ov: Record<string, string> = {}
  for (const r of (rows ?? []) as Array<{ key: string; value: string }>) ov[r.key] = r.value
  return {
    providerTerm: ov['provider_term'] ?? base.providerTerm,
    auditorTerm: ov['auditor_term'] ?? base.auditorTerm,
    missionTerm: base.missionTerm, // défaut édition (forme singulière email)
  }
}
