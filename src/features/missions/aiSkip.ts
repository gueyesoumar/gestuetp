// Motifs de court-circuit renvoyés par le pipeline ai-gate (RFC 0012, P2) et leur
// message utilisateur. Centralisé pour un libellé cohérent sur tous les appelants IA.

export type AiSkipReason = 'cabinet_ai_disabled' | 'consent_required' | 'blocked' | string

export interface AiSkipNotice {
  tone: 'info' | 'warning' | 'blocked'
  title: string
  message: string
}

/** true si la réponse edge est un court-circuit du pipeline (rien n'a été envoyé au modèle). */
export function isAiSkip(reason: unknown): reason is AiSkipReason {
  return typeof reason === 'string' && reason.length > 0
}

export function aiSkipNotice(reason: AiSkipReason): AiSkipNotice {
  switch (reason) {
    case 'cabinet_ai_disabled':
      return {
        tone: 'info',
        title: 'IA désactivée pour ce cabinet',
        message: "Aucune donnée n'est transmise au modèle. Réactivez l'IA dans Réglages → Organisation.",
      }
    case 'consent_required':
      return {
        tone: 'warning',
        title: 'Accord du client requis',
        message: "Ce contenu est de sensibilité élevée : le client doit consentir à l'analyse IA. Activez le consentement sur la fiche client (ou surchargez la mission).",
      }
    case 'blocked':
      return {
        tone: 'blocked',
        title: 'Envoi bloqué',
        message: 'Un secret (clé, mot de passe…) a été détecté dans le contenu. Il ne peut pas être transmis au modèle. Retirez-le du document avant de réessayer.',
      }
    default:
      return {
        tone: 'info',
        title: 'Analyse IA indisponible',
        message: "L'analyse IA n'a pas pu être lancée pour ce contenu.",
      }
  }
}
