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

interface ProductVocab {
  /** Libellé d'une entité supervisée, singulier / pluriel / titre de page. */
  entitySingular: string
  entityPlural: string
  entitiesTitle: string
  /** Tag produit affiché dans le logo. */
  logoTag: 'comply' | 'regul'
}

const VOCAB: Record<ProductMode, ProductVocab> = {
  comply: {
    entitySingular: 'entité',
    entityPlural: 'entités',
    entitiesTitle: 'Entités',
    logoTag: 'comply',
  },
  regul: {
    entitySingular: 'assujetti',
    entityPlural: 'assujettis',
    entitiesTitle: 'Assujettis',
    logoTag: 'regul',
  },
}

/** Vocabulaire du produit courant. */
export const productVocab: ProductVocab = VOCAB[PRODUCT]
