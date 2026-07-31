// Source UNIQUE des identifiants de modèles Claude pour les edge functions.
// Ne jamais écrire un ID de modèle en dur ailleurs : un modèle retiré côté
// Anthropic = 404 partout (cf. l'incident claude-sonnet-4-20250514).
// Mettre à jour ces deux constantes quand Anthropic fait évoluer les modèles.

export const CLAUDE_SONNET = 'claude-sonnet-4-6'
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001'
