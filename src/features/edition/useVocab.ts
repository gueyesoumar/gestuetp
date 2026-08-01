import { useEdition } from './EditionContext'
import { preAuthEdition, vocabForEdition, type ProductVocab } from '../../lib/product'

// Vocabulaire résolu par l'ÉDITION au runtime (Phase 2 — incrément 2).
//
// Repli sur la constante de build `productVocab` tant que l'édition n'est pas
// résolue (edition null : en cours de chargement, ou role=client dont l'org est
// neutralisée côté RLS). Comportement identique par déploiement (jibbl→comply,
// snayz→regul) : on ne fait que déplacer la SOURCE (build → runtime), pas la valeur.
export function useVocab(): ProductVocab {
  const { edition } = useEdition()
  return vocabForEdition(edition ?? preAuthEdition())
}
