// Constantes centralisees pour les listes deroulantes
// Utiliser ces valeurs partout pour garantir la coherence

export const EFFECTIFS_OPTIONS = [
  'Moins de 50',
  '50 à 250',
  '250 à 1 000',
  '1 000 à 5 000',
  'Plus de 5 000',
] as const

export const SECTEURS_OPTIONS = [
  'Administration publique',
  'Agriculture',
  'Assurance',
  'Banque / Finance',
  'BTP / Construction',
  'Commerce / Distribution',
  'Conseil',
  'Défense',
  'Éducation / Formation',
  'Énergie',
  'Hôtellerie / Restauration',
  'Immobilier',
  'Industrie / Manufacturing',
  'Logistique / Transport',
  'Médias / Communication',
  'Mines / Extraction',
  'ONG / Associations',
  'Santé / Pharmaceutique',
  'Services aux entreprises',
  'Télécommunications',
  'Technologies / IT',
  'Tourisme',
  'Autre',
] as const

export const PAYS_OPTIONS = [
  'Bénin',
  'Burkina Faso',
  'Cameroun',
  'Canada',
  'Côte d\'Ivoire',
  'France',
  'Gabon',
  'Guinée',
  'Mali',
  'Maroc',
  'Maurice',
  'Niger',
  'République Démocratique du Congo',
  'Sénégal',
  'Suisse',
  'Togo',
  'Tunisie',
  'Autre',
] as const

export const CHIFFRE_AFFAIRES_OPTIONS = [
  'Moins de 100M FCFA',
  '100M - 500M FCFA',
  '500M - 1Md FCFA',
  '1Md - 5Mds FCFA',
  '5Mds - 20Mds FCFA',
  'Plus de 20Mds FCFA',
] as const

export const IMPACT_OPTIONS = [
  { value: 'fort', label: 'Fort' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'faible', label: 'Faible' },
] as const

export const EXIGENCE_TYPE_OPTIONS = [
  { value: 'legale', label: 'Légale' },
  { value: 'reglementaire', label: 'Réglementaire' },
  { value: 'contractuelle', label: 'Contractuelle' },
  { value: 'normative', label: 'Normative' },
] as const

export const PARTIE_INTERESSEE_TYPE_OPTIONS = [
  { value: 'interne', label: 'Interne' },
  { value: 'externe', label: 'Externe' },
] as const

export const ORG_TYPE_OPTIONS = [
  { value: 'cabinet', label: 'Cabinet de conseil' },
  { value: 'client', label: 'Client' },
  { value: 'groupe', label: 'Groupe / Holding' },
  { value: 'fonds', label: 'Fonds d\'investissement' },
] as const
