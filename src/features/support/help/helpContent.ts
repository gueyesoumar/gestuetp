// Base de connaissances curée (statique) du Centre d'aide. Contenu maintenu à la
// main ici plutôt qu'en base : aucun backend, self-service immédiat. Les réponses
// pointent vers les vraies surfaces de l'app.

export interface HelpArticle {
  id: string
  category: string
  question: string
  answer: string
  keywords?: string[]
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'navigation-hub',
    category: 'Démarrer',
    question: 'Comment naviguer entre les modules ?',
    answer: "Le Hub ETP est le point d'entrée : il regroupe vos modules. Depuis un espace de travail, utilisez « Retour au Hub ETP » en haut de la barre latérale pour y revenir.",
    keywords: ['hub', 'modules', 'accueil', 'naviguer'],
  },
  {
    id: 'reset-password',
    category: 'Compte & sécurité',
    question: 'Comment réinitialiser mon mot de passe ?',
    answer: "Rendez-vous dans Mon compte → Sécurité pour définir un nouveau mot de passe. Si vous l'avez oublié, utilisez « Mot de passe oublié ? » sur l'écran de connexion pour recevoir un lien par email.",
    keywords: ['mot de passe', 'oublié', 'connexion', 'sécurité'],
  },
  {
    id: 'setup-2fa',
    category: 'Compte & sécurité',
    question: "Comment configurer l'authentification à deux facteurs (2FA) ?",
    answer: "Le 2FA est requis pour tous les comptes. Dans Mon compte → Sécurité, ajoutez un authentificateur : nommez l'appareil, scannez le QR code avec votre application (Google/Microsoft Authenticator…) puis saisissez le code à 6 chiffres.",
    keywords: ['2fa', 'double authentification', 'totp', 'authentificateur', 'qr'],
  },
  {
    id: 'lost-authenticator',
    category: 'Compte & sécurité',
    question: "J'ai perdu mon téléphone d'authentification, que faire ?",
    answer: "Si vous disposez encore d'un second authentificateur, connectez-vous puis retirez l'ancien depuis Mon compte → Sécurité. Sinon, faites une demande au support pour réinitialiser votre 2FA.",
    keywords: ['2fa', 'perdu', 'téléphone', 'authentificateur', 'bloqué'],
  },
  {
    id: 'invite-member',
    category: 'Membres & rôles',
    question: 'Comment inviter un nouveau membre ?',
    answer: "Dans Organisation → Membres, cliquez sur « Inviter un membre », renseignez l'email et le rôle. Un lien d'invitation est envoyé automatiquement. Nécessite la permission de gestion des membres.",
    keywords: ['inviter', 'membre', 'équipe', 'ajouter', 'utilisateur'],
  },
  {
    id: 'manage-roles',
    category: 'Membres & rôles',
    question: 'Comment gérer les rôles et les permissions ?',
    answer: "Dans Organisation → Rôles & permissions, créez ou modifiez un rôle et cochez les permissions (missions, membres, paramètres…). Assignez ensuite le rôle à un membre depuis l'onglet Membres.",
    keywords: ['rôle', 'permission', 'droits', 'accès'],
  },
  {
    id: 'create-mission',
    category: 'Missions',
    question: 'Comment créer une mission ?',
    answer: "Depuis Missions → Nouvelle mission, suivez l'assistant : type, client, périmètre, équipe, calendrier, puis confirmation.",
    keywords: ['mission', 'créer', 'audit', 'nouvelle'],
  },
  {
    id: 'client-portal-access',
    category: 'Portail client',
    question: 'Comment donner accès au portail à un client ?',
    answer: "Créez le client puis invitez son contact : il recevra un accès au portail où il suit ses missions et échange les documents. Un client n'accède qu'à ses propres données.",
    keywords: ['client', 'portail', 'accès', 'inviter'],
  },
  {
    id: 'audit-trail-access',
    category: 'Conformité',
    question: "Qui peut consulter la piste d'audit ?",
    answer: "La piste d'audit est réservée aux profils disposant de la permission dédiée. Elle est accessible dans Organisation → Piste d'audit et permet l'export des événements.",
    keywords: ['piste', 'audit', 'traçabilité', 'journal', 'logs'],
  },
  {
    id: 'activate-module',
    category: 'Facturation & plan',
    question: 'Comment activer un module ou changer de plan ?',
    answer: "Depuis le Centre d'aide → Faire une demande, choisissez « Activer une fonctionnalité » ou « Changer de plan ». La demande est routée vers l'équipe habilitée à la traiter.",
    keywords: ['module', 'plan', 'activer', 'abonnement', 'fonctionnalité'],
  },
]

export const SUPPORT_CONTACT = {
  email: 'support@gestugroup.com',
  responseTime: 'Réponse sous 1 jour ouvré',
} as const

// Normalise pour une recherche insensible à la casse et aux accents.
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function searchHelpArticles(query: string): HelpArticle[] {
  const q = normalize(query.trim())
  if (!q) return []
  const terms = q.split(/\s+/)
  return HELP_ARTICLES.filter((a) => {
    const haystack = normalize([a.question, a.answer, a.category, ...(a.keywords ?? [])].join(' '))
    return terms.every((t) => haystack.includes(t))
  })
}
