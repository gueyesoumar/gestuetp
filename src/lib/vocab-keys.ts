import type { ProductVocab } from './product'

// Clés de vocab éditables (RFC 0002, P3a). Bornées à ce que `useVocab` applique
// déjà : les autres clés du catalogue (provider_term, mission_term…) s'ajouteront
// quand P2 aura branché leurs surfaces.
export interface VocabKeyDef {
  key: string
  label: string
  field: keyof ProductVocab
  hint?: string
}

export const EDITABLE_VOCAB_KEYS: VocabKeyDef[] = [
  { key: 'entity_singular', label: 'Entité — singulier', field: 'entitySingular', hint: '« un assujetti »' },
  { key: 'entity_plural', label: 'Entité — pluriel', field: 'entityPlural', hint: '« vos assujettis »' },
  { key: 'entities_title', label: 'Titre de section / navigation', field: 'entitiesTitle' },
  { key: 'entity_with_dem', label: 'Forme démonstrative', field: 'entityWithDem', hint: '« concernant cet assujetti »' },
  { key: 'portal_label', label: 'Libellé du portail', field: 'portalLabel' },
]
