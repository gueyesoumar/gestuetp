import { useEdition } from './EditionContext'
import { preAuthEdition, vocabForEdition, type ProductVocab } from '../../lib/product'

// Vocabulaire résolu par l'ÉDITION au runtime (Phase 2 — incrément 2).
//
// Repli sur `preAuthEdition()` (hostname/env) tant que l'édition n'est pas résolue
// (edition null : en cours de chargement, ou role=client neutralisé côté RLS avant
// la résolution superviseur). Le produit n'est plus un fork de build.
export function useVocab(): ProductVocab {
  const { edition, vocab } = useEdition()
  const base = vocabForEdition(edition ?? preAuthEdition())
  // Overrides par org (RFC 0002, P1) : seuls les LIBELLÉS sont personnalisables ;
  // entityRouteBase et logoTag restent structurels (issus de l'édition). Vide au
  // départ → base inchangée (iso-fonctionnel).
  if (vocab.size === 0) return base
  return {
    ...base,
    entitySingular: vocab.get('entity_singular') ?? base.entitySingular,
    entityPlural: vocab.get('entity_plural') ?? base.entityPlural,
    entitiesTitle: vocab.get('entities_title') ?? base.entitiesTitle,
    entityWithDem: vocab.get('entity_with_dem') ?? base.entityWithDem,
    portalLabel: vocab.get('portal_label') ?? base.portalLabel,
  }
}
