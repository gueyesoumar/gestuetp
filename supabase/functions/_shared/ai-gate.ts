// Orchestrateur unique de l'exposition IA (P2 — RFC 0012 §4).
// Point d'étranglement : TOUTE fonction edge qui envoie du texte client à un modèle
// externe passe par guardAiExposure() AVANT son fetch Anthropic.
//
// Enchaîne : kill-switch cabinet → détection déterministe → score d'exposition →
// résolution du consentement (cabinet_clients + surcharge mission) → politique →
// caviardage → scellement dans la piste d'audit probante F6 (activity_log).
//
// Sécurité : le caviardage réduit l'exposition réelle avant l'envoi ; aucune valeur
// sensible n'est persistée (seulement un hash du payload) ; posture par défaut sûre
// (consentement absent = non consenti → sensible élevé bloqué).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { isAiEnabled, AI_DISABLED_REASON } from './ai-guard.ts'
import { detectPii } from './pii-detect.ts'
import { computeExposure, type ExposureScore } from './exposure-score.ts'
import { resolvePolicy, type PolicyAction } from './ai-policy.ts'
import { redactText } from './ai-redact.ts'
import { pseudonymize } from './ai-pseudonymize.ts'
import { logActivity } from './audit-log.ts'

export type AiGateOutcome = 'disabled' | 'allow' | 'redact' | 'consent_required' | 'blocked'

export interface AiGateInput {
  admin: SupabaseClient
  /** organizations.id du cabinet (pour le kill-switch et le scoping d'audit). */
  cabinetId: string | null | undefined
  /** missions.id — sert à résoudre la surcharge de consentement et l'org auditée. */
  missionId?: string | null
  /** missions.client_id (organisation auditée) si déjà connu — évite une requête. */
  clientOrgId?: string | null
  /** Texte assemblé à envoyer au modèle (prompt + contexte client). */
  text: string
  /** Destination réelle, ex. 'anthropic:claude-sonnet-4-6'. Affichée/scellée telle quelle. */
  destination: string
  /** Nom de la fonction edge appelante (pour l'audit). */
  functionName: string
  actorUserId?: string | null
  targetType?: string | null
  targetId?: string | null
  /**
   * L'appelant SAIT ré-hydrater la réponse du modèle (via rehydrate()). Requis pour que
   * l'anonymisation réversible s'applique : sans cette garantie, les jetons [EMAIL_1]…
   * fuiteraient tels quels dans la sortie affichée. P4.1 : seul smart-analyse le pose.
   */
  rehydrates?: boolean
}

export interface AiGateResult {
  outcome: AiGateOutcome
  /** Texte à transmettre au modèle (caviardé si redact, pseudonymisé si anonymized). */
  text: string
  exposure: ExposureScore
  action: PolicyAction
  /** Motif renvoyé au frontend quand rien n'est envoyé (sinon null). */
  skipped_reason: string | null
  /** true uniquement quand un envoi au modèle est autorisé. */
  allowed: boolean
  /** true si le texte a été pseudonymisé (anonymisation réversible, P4). */
  anonymized: boolean
  /**
   * Table de correspondance jeton → valeur réelle, à conserver EN MÉMOIRE le temps de
   * l'appel pour ré-hydrater la réponse du modèle (via rehydrate()). Jamais transmise au
   * modèle ni persistée en clair. null si pas d'anonymisation.
   */
  mapping: Record<string, string> | null
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

type FlagRow = Record<string, unknown> & { client_id?: string | null }

/**
 * Résout un drapeau tri-état porté par le couple fiche client / surcharge mission :
 * surcharge mission (si non NULL) sinon valeur de la fiche client. Défaut sûr : false.
 * Mutualisé par le consentement (ai_consent) et l'anonymisation (ai_anonymize), qui
 * partagent exactement ce modèle (RFC 0012, mig 00262 & 00266).
 */
async function resolveMissionFlag(
  admin: SupabaseClient,
  cabinetId: string,
  overrideCol: string,
  ficheCol: string,
  missionId?: string | null,
  clientOrgId?: string | null,
): Promise<boolean> {
  let override: boolean | null | undefined = undefined
  let org = clientOrgId ?? null

  if (missionId) {
    // Cast : friction de génériques supabase-js (idiome du repo, cf. ai-guard.ts).
    const { data } = await (admin
      .from('missions')
      .select(`client_id, ${overrideCol}`)
      .eq('id', missionId)
      .maybeSingle() as unknown as Promise<{ data: FlagRow | null }>)
    const raw = data?.[overrideCol]
    override = typeof raw === 'boolean' ? raw : null
    org = org ?? data?.client_id ?? null
  }

  // Surcharge explicite (true OU false) l'emporte sur la fiche client.
  if (override === true) return true
  if (override === false) return false

  if (!org) return false
  const { data: cc } = await (admin
    .from('cabinet_clients')
    .select(ficheCol)
    .eq('cabinet_id', cabinetId)
    .eq('client_org_id', org)
    .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null }>)
  return cc?.[ficheCol] === true
}

/**
 * Consentement IA effectif (surcharge mission → fiche client). Défaut sûr : false.
 * Exporté pour les fonctions qui joignent des documents (ex. smart-analyse).
 */
export function resolveAiConsent(
  admin: SupabaseClient,
  cabinetId: string,
  missionId?: string | null,
  clientOrgId?: string | null,
): Promise<boolean> {
  return resolveMissionFlag(admin, cabinetId, 'ai_consent_override', 'ai_consent', missionId, clientOrgId)
}

/**
 * Anonymisation réversible effective (surcharge mission → fiche client). Défaut sûr : false
 * (= comportement P2 inchangé). Opt-in RFC 0012 P4.
 */
export function resolveAiAnonymize(
  admin: SupabaseClient,
  cabinetId: string,
  missionId?: string | null,
  clientOrgId?: string | null,
): Promise<boolean> {
  return resolveMissionFlag(admin, cabinetId, 'ai_anonymize_override', 'ai_anonymize', missionId, clientOrgId)
}

/**
 * Garde d'exposition complet. À appeler avant tout envoi au modèle.
 * Si outcome !== 'allow'/'redact', NE PAS envoyer : renvoyer skipped_reason au frontend.
 */
export async function guardAiExposure(input: AiGateInput): Promise<AiGateResult> {
  const { admin, cabinetId, text } = input

  // [0] Kill-switch cabinet — court-circuit sans rien calculer ni envoyer.
  const enabled = await isAiEnabled(admin, cabinetId)
  const exposure = computeExposure([text])
  if (!enabled) {
    return {
      outcome: 'disabled', text, exposure, action: 'blocked',
      skipped_reason: AI_DISABLED_REASON, allowed: false,
      anonymized: false, mapping: null,
    }
  }

  // [1] Détection déterministe + [score] déjà dans `exposure`.
  const matches = detectPii(text)
  const hasSecret = exposure.counts.secret > 0

  // [2] Consentement + anonymisation effectifs (surcharge mission → fiche client).
  const hasConsent = cabinetId
    ? await resolveAiConsent(admin, cabinetId, input.missionId ?? null, input.clientOrgId ?? null)
    : false
  const anonymizeOptIn = cabinetId
    ? await resolveAiAnonymize(admin, cabinetId, input.missionId ?? null, input.clientOrgId ?? null)
    : false

  // [3] Politique. Sans cabinet (appel hors mission), aucun consentement n'est
  // résoluble : on dégrade « demander accord » en caviardage (minimisation), le
  // secret restant toujours bloqué. L'anonymisation NE contourne PAS le blocage
  // secret ni le consentement (posture sûre) : elle ne transforme que ce qui serait envoyé.
  let action = resolvePolicy({ level: exposure.level, hasSecret, hasConsent })
  if (!cabinetId && action === 'consent_required') action = 'redact'

  // [4] Transformation du texte à envoyer :
  //   - anonymisation active → pseudonymisation réversible (jetons cohérents + table) ;
  //     remplace le caviardage et minimise aussi le « allow ».
  //   - sinon, caviardage si la politique l'exige (moyenne).
  const willSend = action === 'allow' || action === 'redact'
  // Anonymisation seulement si l'appelant sait ré-hydrater (sinon les jetons fuiteraient
  // dans la sortie affichée). Les flux non adaptés gardent le comportement P2 (caviardage).
  const doAnonymize = willSend && anonymizeOptIn && input.rehydrates === true
  let finalText = text
  let mapping: Record<string, string> | null = null
  if (doAnonymize) {
    const ps = pseudonymize(text, matches)
    finalText = ps.text
    mapping = ps.mapping
  } else if (action === 'redact') {
    finalText = redactText(text, matches).text
  }
  const skipped_reason =
    action === 'consent_required' ? 'consent_required' : action === 'blocked' ? 'blocked' : null

  // [5] Scellement F6 — score + politique + destination + hash (jamais le clair).
  // Pour l'anonymisation : seul un condensé de la table est scellé (preuve sans fuite).
  if (cabinetId) {
    const payloadSha = willSend ? await sha256Hex(finalText) : null
    const inputSha = await sha256Hex(text)
    const mappingSha = mapping ? await sha256Hex(JSON.stringify(mapping)) : null
    await logActivity(admin, {
      organizationId: cabinetId,
      actorUserId: input.actorUserId ?? null,
      action: 'ai.exposure_decision',
      targetType: input.targetType ?? 'ai_call',
      targetId: input.targetId ?? input.missionId ?? null,
      summary: `Exposition IA ${exposure.level} (score ${exposure.score}) → ${action}${doAnonymize ? ' (anonymisé)' : ''}`,
      metadata: {
        function: input.functionName,
        score: exposure.score,
        level: exposure.level,
        counts: exposure.counts,
        pct_flagged: exposure.pct_flagged,
        policy: action,
        destination: input.destination,
        sent: willSend,
        consent: hasConsent,
        anonymized: doAnonymize,
        mapping_sha256: mappingSha,
        input_sha256: inputSha,
        payload_sha256: payloadSha,
      },
    })
  }

  return {
    outcome: action === 'allow' ? 'allow' : action,
    text: finalText,
    exposure,
    action,
    skipped_reason,
    allowed: willSend,
    anonymized: doAnonymize,
    mapping,
  }
}
