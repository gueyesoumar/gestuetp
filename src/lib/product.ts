// Vocabulaire & édition — un seul codebase ETP. Le produit/module N'EST PLUS un
// fork de build : il est résolu AU RUNTIME (édition post-auth, cf features/edition)
// avec un simple indice pré-auth (`preAuthEdition`, ci-dessous). Regul = édition.

export type ProductMode = 'comply' | 'regul'

// Édition résolue PRÉ-AUTHENTIFICATION (avant de connaître l'org connectée) : sert
// d'indice de branding/coquille tant que l'édition runtime n'est pas résolue.
// Priorité : override explicite `VITE_EDITION` > hostname (`/regul/`). N'est PLUS
// un fork de domaine — juste une allure de login. Un domaine custom (ex. DCSSI)
// pose `VITE_EDITION=regul`.
export function preAuthEdition(): 'regul' | 'comply' {
  const env = import.meta.env.VITE_EDITION as string | undefined
  if (env === 'regul' || env === 'comply') return env
  if (typeof window !== 'undefined' && /regul/i.test(window.location.hostname)) return 'regul'
  return 'comply'
}

export interface ProductVocab {
  /** Libellé d'une entité supervisée, singulier / pluriel / titre de page. */
  entitySingular: string
  entityPlural: string
  entitiesTitle: string
  /** Genre grammatical de l'entité → pilote l'accord FR (un/une, rattaché·e). */
  entityGender: 'm' | 'f'
  /** Base de route de la fiche entité (diffère selon le produit). */
  entityRouteBase: string
  /** Base de route d'une unité de travail (« /missions » / « /controles »). Structurel. */
  missionRouteBase: string
  /** Tag produit affiché dans le logo. */
  logoTag: 'comply' | 'regul'
  /** Sous-titre de la coquille du portail (côté partie auditée). */
  portalLabel: string
  /** Entité précédée de son démonstratif (élision FR gérée) : « cette entité » / « cet assujetti ». */
  entityWithDem: string
  /** Unité de travail : « Missions » / « Contrôles ». */
  missionTerm: string
  /** Résultat d'évaluation : « constat ». */
  findingTerm: string
  /** Pluriel du terme « constat » (évite un « +s » naïf sur un terme irrégulier). */
  findingPlural: string
  /** Genre grammatical du terme « constat » → pilote l'accord FR. */
  findingGender: 'm' | 'f'
  /** Acte émis : « recommandation » / « mesure ». */
  measureTerm: string
  /** Pluriel du terme « mesure ». */
  measurePlural: string
  /** Genre grammatical du terme « mesure » → pilote l'accord FR. */
  measureGender: 'm' | 'f'
  /** Bandeau de contexte en haut de la coquille (vide = pas de bandeau). */
  contextBanner: string
  contextBannerSub: string
  /** Rôle émetteur : « cabinet » / « régulateur » (surtout emails). */
  providerTerm: string
  /** Personne qui mène : « auditeur » / « contrôleur » (surtout emails). */
  auditorTerm: string
  /** Genre grammatical du rôle auditeur → pilote l'accord FR (le/la). */
  auditorGender: 'm' | 'f'
  /** Acteurs de validation interne (niveaux de revue). */
  leadTerm: string
  associateTerm: string
  /** Rôles côté partie auditée (portail). */
  clientApproverTerm: string
  /** Genre grammatical du rôle approbateur client → pilote l'accord FR (le/la). */
  clientApproverGender: 'm' | 'f'
  clientContributorTerm: string
  clientViewerTerm: string
}

// Presets de vocabulaire, nommés et data-driven (RFC 0013 C2) : ajouter une édition
// (ex. « entreprise ») = une entrée ici, plus un booléen de persona. La résolution
// choisit le preset via le module-cœur actif (moduleRegistry.vocabPreset).
export const VOCAB_PRESETS: Record<string, ProductVocab> = {
  comply: {
    entitySingular: 'entité',
    entityPlural: 'entités',
    entitiesTitle: 'Entités',
    entityGender: 'f',
    entityRouteBase: '/filiales',
    missionRouteBase: '/missions',
    logoTag: 'comply',
    portalLabel: 'Portail Client',
    entityWithDem: 'cette entité',
    missionTerm: 'Missions',
    findingTerm: 'constat',
    findingPlural: 'constats',
    findingGender: 'm',
    measureTerm: 'recommandation',
    measurePlural: 'recommandations',
    measureGender: 'f',
    contextBanner: '',
    contextBannerSub: '',
    providerTerm: 'cabinet',
    auditorTerm: 'auditeur',
    auditorGender: 'm',
    leadTerm: 'Chef de mission',
    associateTerm: 'Associé',
    clientApproverTerm: 'Approbateur',
    clientApproverGender: 'm',
    clientContributorTerm: 'Contributeur',
    clientViewerTerm: 'Lecteur',
  },
  regul: {
    entitySingular: 'assujetti',
    entityPlural: 'assujettis',
    entitiesTitle: 'Assujettis',
    entityGender: 'm',
    entityRouteBase: '/assujettis',
    missionRouteBase: '/controles',
    logoTag: 'regul',
    portalLabel: 'Portail Assujetti',
    entityWithDem: 'cet assujetti',
    missionTerm: 'Contrôles',
    findingTerm: 'constat',
    findingPlural: 'constats',
    findingGender: 'm',
    measureTerm: 'mesure',
    measurePlural: 'mesures',
    measureGender: 'f',
    contextBanner: 'Console régulateur',
    contextBannerSub: 'Superviseur de conformité cyber',
    providerTerm: 'régulateur',
    auditorTerm: 'contrôleur',
    auditorGender: 'm',
    leadTerm: 'Chef de mission',
    associateTerm: 'Associé',
    clientApproverTerm: 'Approbateur',
    clientApproverGender: 'm',
    clientContributorTerm: 'Contributeur',
    clientViewerTerm: 'Lecteur',
  },
}

/** Défauts de vocab résolus par la PERSONA (capacité supervision) — RFC 0002/0006.
 *  Le front ne lit plus l'édition (supprimée en C+P3). */
/** Vocabulaire de base d'un preset nommé (repli sur « comply » si inconnu). */
export function vocabForPreset(preset: string): ProductVocab {
  return VOCAB_PRESETS[preset] ?? VOCAB_PRESETS.comply
}
