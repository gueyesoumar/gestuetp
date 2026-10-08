import { useEdition } from './EditionContext'
import { vocabForPersona, type ProductVocab } from '../../lib/product'

// Vocabulaire résolu par l'ÉDITION au runtime (Phase 2 — incrément 2).
//
// Repli sur `preAuthEdition()` (hostname/env) tant que l'édition n'est pas résolue
// (edition null : en cours de chargement, ou role=client neutralisé côté RLS avant
// la résolution superviseur). Le produit n'est plus un fork de build.
export function useVocab(): ProductVocab {
  const { hasCapability, vocab } = useEdition()
  const base = vocabForPersona(hasCapability('supervision'))
  // Overrides par org (RFC 0002, P1) : seuls les LIBELLÉS sont personnalisables ;
  // entityRouteBase et logoTag restent structurels (issus de l'édition). Vide au
  // départ → base inchangée (iso-fonctionnel).
  if (vocab.size === 0) return base
  // Un override de genre n'est retenu que s'il vaut 'm' ou 'f' (sinon → défaut).
  const gender = (key: string, fallback: 'm' | 'f'): 'm' | 'f' => {
    const v = vocab.get(key)
    return v === 'm' || v === 'f' ? v : fallback
  }
  return {
    ...base,
    entitySingular: vocab.get('entity_singular') ?? base.entitySingular,
    entityPlural: vocab.get('entity_plural') ?? base.entityPlural,
    entitiesTitle: vocab.get('entities_title') ?? base.entitiesTitle,
    entityWithDem: vocab.get('entity_with_dem') ?? base.entityWithDem,
    entityGender: gender('entity_gender', base.entityGender),
    portalLabel: vocab.get('portal_label') ?? base.portalLabel,
    missionTerm: vocab.get('mission_term') ?? base.missionTerm,
    findingTerm: vocab.get('finding_term') ?? base.findingTerm,
    findingPlural: vocab.get('finding_plural') ?? base.findingPlural,
    findingGender: gender('finding_gender', base.findingGender),
    measureTerm: vocab.get('measure_term') ?? base.measureTerm,
    measurePlural: vocab.get('measure_plural') ?? base.measurePlural,
    measureGender: gender('measure_gender', base.measureGender),
    contextBanner: vocab.get('context_banner') ?? base.contextBanner,
    contextBannerSub: vocab.get('context_banner_sub') ?? base.contextBannerSub,
    providerTerm: vocab.get('provider_term') ?? base.providerTerm,
    auditorTerm: vocab.get('auditor_term') ?? base.auditorTerm,
    auditorGender: gender('auditor_gender', base.auditorGender),
    leadTerm: vocab.get('lead_term') ?? base.leadTerm,
    associateTerm: vocab.get('associate_term') ?? base.associateTerm,
    clientApproverTerm: vocab.get('client_approver_term') ?? base.clientApproverTerm,
    clientApproverGender: gender('client_approver_gender', base.clientApproverGender),
    clientContributorTerm: vocab.get('client_contributor_term') ?? base.clientContributorTerm,
    clientViewerTerm: vocab.get('client_viewer_term') ?? base.clientViewerTerm,
  }
}
