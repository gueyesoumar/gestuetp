// Catalogue des sections de contenu du rapport (key + titre), SANS dependance
// react-pdf : l'editeur de templates (UI) l'importe sans tirer le moteur PDF dans
// le bundle. Source de verite des libelles/ordre par defaut.
export interface SectionCatalogEntry { key: string; title: string }

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  { key: 'context', title: 'Contexte de la mission' },
  { key: 'methodology', title: 'Méthodologie' },
  { key: 'synthesis', title: 'Synthèse exécutive' },
  { key: 'domains', title: 'Résultats par domaine' },
  { key: 'nc_fiches', title: 'Fiches de non-conformités majeures' },
  { key: 'recommendations', title: 'Recommandations' },
  { key: 'action_plan', title: 'Plan d’action' },
  { key: 'conclusion', title: 'Conclusion' },
  { key: 'annex_glossary', title: 'Annexe A - Glossaire' },
  { key: 'annex_evidence', title: 'Annexe B - Preuves examinées' },
  { key: 'annex_references', title: 'Annexe C - Références normatives' },
  { key: 'annex_distribution', title: 'Annexe D - Liste de diffusion' },
]
