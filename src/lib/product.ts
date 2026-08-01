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
  /** Base de route de la fiche entité (diffère selon le produit). */
  entityRouteBase: string
  /** Tag produit affiché dans le logo. */
  logoTag: 'comply' | 'regul'
  /** Sous-titre de la coquille du portail (côté partie auditée). */
  portalLabel: string
  /** Entité précédée de son démonstratif (élision FR gérée) : « cette entité » / « cet assujetti ». */
  entityWithDem: string
}

const VOCAB: Record<ProductMode, ProductVocab> = {
  comply: {
    entitySingular: 'entité',
    entityPlural: 'entités',
    entitiesTitle: 'Entités',
    entityRouteBase: '/filiales',
    logoTag: 'comply',
    portalLabel: 'Portail Client',
    entityWithDem: 'cette entité',
  },
  regul: {
    entitySingular: 'assujetti',
    entityPlural: 'assujettis',
    entitiesTitle: 'Assujettis',
    entityRouteBase: '/assujettis',
    logoTag: 'regul',
    portalLabel: 'Portail Assujetti',
    entityWithDem: 'cet assujetti',
  },
}

/** Vocabulaire résolu par l'ÉDITION (runtime, RFC 0001). regul → assujetti, sinon → client/entité. */
export function vocabForEdition(edition: string): ProductVocab {
  return edition === 'regul' ? VOCAB.regul : VOCAB.comply
}
