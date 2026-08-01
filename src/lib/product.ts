// Mode produit — un seul codebase, deux produits (Gëstu Comply / Gëstu Regul).
//
// Le mode est fixé au build/déploiement via VITE_PRODUCT ('comply' par défaut,
// 'regul' pour l'instance dédiée régulateur). Le code reste identique ; seuls
// le branding, le vocabulaire et l'exposition des modules régulateur changent.
//
// Regul réutilise la machinerie du module Groupe : l'organe régulateur est une
// organisation "groupe", les assujettis sont ses entités rattachées. Ce module
// ne fait que relabéliser et exposer le spécifique régulateur.

export type ProductMode = 'comply' | 'regul'

export const PRODUCT: ProductMode =
  (import.meta.env.VITE_PRODUCT as string | undefined) === 'regul' ? 'regul' : 'comply'

export const isRegul = PRODUCT === 'regul'

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

/** Vocabulaire du produit courant (figé au build — repli tant que l'édition runtime n'est pas résolue). */
export const productVocab: ProductVocab = VOCAB[PRODUCT]

/** Vocabulaire résolu par l'ÉDITION (runtime, RFC 0001). regul → assujetti, sinon → client/entité. */
export function vocabForEdition(edition: string): ProductVocab {
  return edition === 'regul' ? VOCAB.regul : VOCAB.comply
}
