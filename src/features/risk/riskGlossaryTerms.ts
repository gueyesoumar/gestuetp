// Glossaire du module Risk (vocabulaire ISO 27005, formule d'exposition, IIC).
// Centralise les definitions affichees in-app (RiskGlossary) et sert de reference
// partagee. Distinct du glossaire d'audit (auditReportNarratives, termes de mission).

export interface GlossaryTerm {
  term: string
  def: string
}

export const RISK_GLOSSARY: GlossaryTerm[] = [
  { term: 'Scénario de risque', def: 'Situation redoutée décrite comme un enchaînement : une source de risque provoque un événement redouté qui atteint un bien ou un service.' },
  { term: 'Vraisemblance (V)', def: 'Probabilité qu’un risque se réalise, cotée de 1 (rare) à 4 (très probable).' },
  { term: 'Impact (I)', def: 'Gravité des conséquences si le risque se réalise, cotée de 1 (mineur) à 4 (critique).' },
  { term: 'Exposition', def: 'Indice de risque = V × I ramené sur 100. L’exposition inhérente est calculée sans mesures ; l’exposition résiduelle tient compte des barrières en place.' },
  { term: 'Seuil d’acceptation', def: 'Niveau d’exposition au-delà duquel un traitement est requis avant toute acceptation. Configurable par organisation (défaut 60).' },
  { term: 'Hors seuil', def: 'Se dit d’un risque dont l’exposition dépasse le seuil d’acceptation de l’organisation.' },
  { term: 'Barrière', def: 'Mesure de maîtrise. Une barrière préventive réduit la vraisemblance ; une barrière corrective limite l’impact.' },
  { term: 'Nœud papillon', def: 'Représentation d’un risque : causes et barrières préventives à gauche, événement redouté au centre, conséquences et barrières correctives à droite.' },
  { term: 'Événement redouté', def: 'L’événement central que l’on cherche à éviter (par exemple une indisponibilité, une fuite de données, une altération).' },
  { term: 'Source de risque', def: 'Ce qui peut déclencher l’événement redouté : un attaquant, une panne, une erreur humaine ou une cause naturelle.' },
  { term: 'Plan de traitement', def: 'Ensemble des actions décidées pour ramener un risque sous le seuil d’acceptation.' },
  { term: 'Acceptation du risque', def: 'Décision formelle de vivre avec un risque résiduel, pour une durée donnée et par une autorité identifiée.' },
  { term: 'Dérogation', def: 'Acceptation d’un risque qui reste au-dessus du seuil, validée explicitement et à titre exceptionnel.' },
  { term: 'Revue de risque', def: 'Réexamen périodique d’un scénario pour vérifier que son évaluation et son traitement restent valides.' },
  { term: 'Infrastructure vitale (IIC)', def: 'Organisation dont une atteinte aurait des conséquences majeures pour l’État ou la population. La criticité est fixée à la création de l’assujetti (IIC ou Standard).' },
  { term: 'Cycle de vie', def: 'État d’avancement d’un scénario : identifié, analysé, traité, accepté ou clos.' },
  { term: 'Déclaration d’applicabilité (SoA)', def: 'Liste des contrôles retenus comme barrières et justification de ceux qui sont écartés.' },
]
