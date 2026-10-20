// Bibliothèque de modèles d'impact par secteur (RFC 0018 Lot C, décision D-C3 option C).
// Fournit, en langage décideur, une simulation « si ce risque se matérialise » :
// un lead sectoriel, des conséquences par domaine et une mesure de réduction.
// Phase 1 = modèles par secteur (ci-dessous). Phase 2 (C-bis) = surcharge authorée
// par scénario qui primera sur le modèle.

export interface ImpactDomain { tag: string; text: string }
export interface ImpactModel { lead: string; domains: ImpactDomain[]; mitigation: string }

interface SectorEntry { keywords: string[]; model: ImpactModel }

const SECTORS: SectorEntry[] = [
  { keywords: ['finance', 'impot', 'impôt', 'douane', 'tresor', 'trésor', 'fiscal', 'budget'], model: {
    lead: 'le fonctionnement financier de l’État est directement menacé',
    domains: [
      { tag: 'Finances publiques', text: 'Recettes et paiements publics perturbés ; trésorerie de l’État sous tension si l’arrêt se prolonge.' },
      { tag: 'Citoyens', text: 'Démarches et services en ligne indisponibles ; retards pour les usagers et les entreprises.' },
      { tag: 'Souveraineté', text: 'Perte de maîtrise sur un système régalien ; image d’un État vulnérable.' },
    ],
    mitigation: 'Cloisonner les accès à privilèges, disposer de sauvegardes isolées testées et d’un plan de reprise.' } },
  { keywords: ['energie', 'énergie', 'electric', 'électric', 'senelec', 'petrole', 'pétrole'], model: {
    lead: 'l’approvisionnement en énergie peut être interrompu',
    domains: [
      { tag: 'Citoyens', text: 'Coupures d’électricité affectant hôpitaux, eau, télécommunications et transports.' },
      { tag: 'Économie', text: 'Activité ralentie, pertes pour les entreprises et les commerces.' },
      { tag: 'Sécurité', text: 'Risques sur les services d’urgence et l’ordre public.' },
    ],
    mitigation: 'Isoler les systèmes industriels d’Internet et prévoir des moyens de secours.' } },
  { keywords: ['eau', 'assainissement', 'hydraulique'], model: {
    lead: 'la distribution d’eau potable peut être compromise',
    domains: [
      { tag: 'Citoyens', text: 'Accès à l’eau perturbé ; risques sanitaires pour la population.' },
      { tag: 'Sécurité', text: 'Tensions sociales en cas de pénurie prolongée.' },
    ],
    mitigation: 'Superviser les systèmes de pilotage, segmenter le réseau et préparer des procédures manuelles.' } },
  { keywords: ['telecom', 'télécom', 'artp', 'numerique', 'numérique', 'donnee', 'donnée', 'operateur', 'opérateur'], model: {
    lead: 'des données sensibles ou des services numériques essentiels sont exposés',
    domains: [
      { tag: 'Citoyens', text: 'Fuite de données personnelles : usurpations d’identité, arnaques et chantages.' },
      { tag: 'Confiance', text: 'Atteinte durable à la confiance envers les services numériques de l’État.' },
      { tag: 'Juridique', text: 'Responsabilité de l’État et des opérateurs susceptible d’être engagée.' },
    ],
    mitigation: 'Chiffrer les données, détecter les fuites et notifier rapidement les personnes concernées.' } },
  { keywords: ['sante', 'santé', 'hopital', 'hôpital'], model: {
    lead: 'la continuité des soins peut être atteinte',
    domains: [
      { tag: 'Citoyens', text: 'Prise en charge des patients perturbée ; risque vital en cas d’arrêt des systèmes.' },
      { tag: 'Confiance', text: 'Exposition de données médicales sensibles.' },
    ],
    mitigation: 'Sauvegardes hors-ligne, continuité dégradée documentée et exercices de crise.' } },
  { keywords: ['election', 'élection', 'electoral', 'électoral', 'cena', 'scrutin', 'souverain'], model: {
    lead: 'l’intégrité du processus démocratique peut être remise en cause',
    domains: [
      { tag: 'Démocratie', text: 'Doute sur la sincérité du scrutin ; contestation possible des résultats.' },
      { tag: 'Stabilité', text: 'Tensions sociales et politiques.' },
      { tag: 'Souveraineté', text: 'Soupçon d’ingérence extérieure.' },
    ],
    mitigation: 'Journalisation infalsifiable, contrôle d’intégrité et audit indépendant.' } },
  { keywords: ['transport', 'aeroport', 'aéroport', 'port', 'aibd'], model: {
    lead: 'la continuité des transports peut être désorganisée',
    domains: [
      { tag: 'Économie', text: 'Blocage logistique : retards, surcoûts, pénuries possibles.' },
      { tag: 'Citoyens', text: 'Déplacements perturbés pour la population.' },
      { tag: 'Sécurité', text: 'Risques sur la sûreté des infrastructures.' },
    ],
    mitigation: 'Segmenter les systèmes critiques et prévoir des procédures de repli.' } },
]

const GENERIC: ImpactModel = {
  lead: 'un service important peut être interrompu ou détourné',
  domains: [
    { tag: 'Citoyens', text: 'Service rendu à la population dégradé ou indisponible.' },
    { tag: 'Économie', text: 'Pertes et désorganisation pour les acteurs concernés.' },
    { tag: 'Confiance', text: 'Atteinte à la confiance envers l’institution touchée.' },
  ],
  mitigation: 'Renforcer les mesures de protection prioritaires et préparer un plan de reprise.',
}

export function impactFor(sector: string | null): ImpactModel {
  const s = (sector ?? '').toLowerCase()
  return SECTORS.find((e) => e.keywords.some((k) => s.includes(k)))?.model ?? GENERIC
}
