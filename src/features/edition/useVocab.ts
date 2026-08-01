import { useEdition } from './EditionContext'
import { preAuthEdition, vocabForEdition, type ProductVocab } from '../../lib/product'

// Vocabulaire résolu par l'ÉDITION au runtime (Phase 2 — incrément 2).
//
// Repli sur `preAuthEdition()` (hostname/env) tant que l'édition n'est pas résolue
// (edition null : en cours de chargement, ou role=client neutralisé côté RLS avant
// la résolution superviseur). Le produit n'est plus un fork de build.
export function useVocab(): ProductVocab {
  const { edition } = useEdition()
  return vocabForEdition(edition ?? preAuthEdition())
}
