-- 00338 - Enrichissement du catalogue plateforme : modeles de scenarios PAR SECTEUR,
-- ancres dans le contexte du secteur public africain / senegalais (incidents reels et
-- realites operationnelles). Complete le seed generique 00330 (owner_org_id = null).
-- Secteurs = taxonomie PUBLIC_SECTORS (src/lib/constants.ts). Idempotent via un titre temoin.

do $$
declare v_id uuid;
begin
  if exists (select 1 from public.risk_scenario_templates
             where owner_org_id is null
               and title = 'Détournement de recettes via le télépaiement fiscal') then
    return;
  end if;

  -- ===== Fiscalité =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Fiscalité']::text[], 'Détournement de recettes via le télépaiement fiscal', 'integrity', 3, 4, 'Contrôles applicatifs faibles sur les remboursements, séparation des tâches insuffisante.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Compte d''agent compromis',0),(v_id,'cause','Manipulation des montants de remboursement',1),(v_id,'cause','Absence de double validation',2),
    (v_id,'consequence','Remboursements indus de TVA',0),(v_id,'consequence','Perte de recettes pour l''État',1),(v_id,'consequence','Contentieux et enquête',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Fiscalité']::text[], 'Panne prolongée de la plateforme de recouvrement', 'resilience', 3, 4, 'Dépendance à un éditeur unique, pas d''environnement de reprise teste.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Défaillance du serveur central',0),(v_id,'cause','Absence de plan de reprise',1),(v_id,'cause','Maintenance externalisée non maîtrisée',2),
    (v_id,'consequence','Arrêt des paiements d''impôts en ligne',0),(v_id,'consequence','Trésorerie de l''État sous tension',1),(v_id,'consequence','Files d''attente aux guichets',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Fiscalité']::text[], 'Fuite du fichier des contribuables', 'data_protection', 2, 4, 'Base contribuables accessible à trop d''agents, journalisation faible.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Accès interne abusif',0),(v_id,'cause','Exfiltration de la base',1),(v_id,'cause','Absence de traçabilité',2),
    (v_id,'consequence','Exposition de données fiscales sensibles',0),(v_id,'consequence','Chantage et fraudes ciblées',1),(v_id,'consequence','Sanction et perte de confiance',2);

  -- ===== Douanes =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Douanes']::text[], 'Manipulation des valeurs dans le système de dédouanement', 'integrity', 3, 4, 'Valeurs de référence modifiables sans contrôle, complicités internes.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Sous-évaluation complice des marchandises',0),(v_id,'cause','Modification des codes tarifaires',1),(v_id,'cause','Contournement des circuits de contrôle',2),
    (v_id,'consequence','Pertes de recettes douanières',0),(v_id,'consequence','Concurrence déloyale',1),(v_id,'consequence','Corruption et contentieux',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Douanes']::text[], 'Indisponibilité du système de dédouanement au port', 'resilience', 3, 4, 'Système central non redondé, liaison unique vers le port.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Panne du système central',0),(v_id,'cause','Coupure de la liaison vers le port',1),(v_id,'cause','Absence de procédure dégradée',2),
    (v_id,'consequence','Blocage des marchandises',0),(v_id,'consequence','Congestion portuaire et surcoûts',1),(v_id,'consequence','Pénurie sur produits importés',2);

  -- ===== Trésor / Finances publiques =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Trésor / Finances publiques']::text[], 'Fraude sur la chaîne de la dépense publique', 'integrity', 3, 4, 'Référentiel fournisseurs non maîtrisé, séparation des tâches faible.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Création de fournisseurs fictifs',0),(v_id,'cause','Falsification de pièces justificatives',1),(v_id,'cause','Collusion ordonnateur-comptable',2),
    (v_id,'consequence','Paiements indus',0),(v_id,'consequence','Détournement de fonds publics',1),(v_id,'consequence','Observations de la Cour des comptes',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Trésor / Finances publiques']::text[], 'Agents fictifs sur la paie de la fonction publique', 'integrity', 3, 4, 'Fichier de la solde non rapproché de l''état civil et des présences.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Maintien d''agents partis à la retraite',0),(v_id,'cause','Doublons d''identité',1),(v_id,'cause','Absence de rapprochement',2),
    (v_id,'consequence','Surcoût salarial',0),(v_id,'consequence','Détournement organisé',1),(v_id,'consequence','Assainissement coûteux',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Trésor / Finances publiques']::text[], 'Attaque sur le système de gestion des finances publiques', 'security', 2, 4, 'Système intégré critique, accès d''administration trop larges.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Intrusion ciblée',0),(v_id,'cause','Comptes d''administration compromis',1),(v_id,'cause','Absence de supervision de sécurité',2),
    (v_id,'consequence','Paiements bloqués ou détournés',0),(v_id,'consequence','Trésorerie de l''État menacée',1),(v_id,'consequence','Crise de confiance',2);

  -- ===== Justice =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Justice']::text[], 'Altération de dossiers judiciaires numérisés', 'integrity', 2, 4, 'Droits d''accès trop larges au système de gestion des affaires.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Modification de pièces',0),(v_id,'cause','Suppression de procédures',1),(v_id,'cause','Accès non tracé',2),
    (v_id,'consequence','Entrave à la justice',0),(v_id,'consequence','Impunité ou condamnation injuste',1),(v_id,'consequence','Perte de confiance',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Justice']::text[], 'Fuite de données sensibles de procédures', 'data_protection', 2, 3, 'Données de victimes et de témoins insuffisamment protégées.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Exfiltration par un accès interne',0),(v_id,'cause','Partage non sécurisé de documents',1),(v_id,'cause','Absence de chiffrement',2),
    (v_id,'consequence','Mise en danger de victimes et témoins',0),(v_id,'consequence','Pression et représailles',1),(v_id,'consequence','Atteinte au droit à la vie privée',2);

  -- ===== Défense / Sécurité intérieure =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Défense / Sécurité intérieure']::text[], 'Exfiltration de données classifiées par un initié', 'data_protection', 2, 4, 'Supports amovibles autorisés, cloisonnement insuffisant.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Copie par un agent habilité',0),(v_id,'cause','Absence de contrôle des fuites',1),(v_id,'cause','Recrutement hostile',2),
    (v_id,'consequence','Compromission d''opérations',0),(v_id,'consequence','Atteinte à la souveraineté',1),(v_id,'consequence','Risque pour des agents',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Défense / Sécurité intérieure']::text[], 'Compromission d''un réseau de commandement', 'security', 2, 4, 'Menace persistante avancée, segmentation insuffisante.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Intrusion ciblée de longue durée',0),(v_id,'cause','Mouvement latéral non détecté',1),(v_id,'cause','Absence de détection avancée',2),
    (v_id,'consequence','Perte de confidentialité opérationnelle',0),(v_id,'consequence','Manipulation possible des systèmes',1),(v_id,'consequence','Atteinte à la sécurité nationale',2);

  -- ===== Élections / État civil =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Altération du fichier électoral', 'integrity', 2, 4, 'Contrôles d''intégrité faibles, accès concentrés avant le scrutin.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Ajout ou retrait d''électeurs',0),(v_id,'cause','Modification des bureaux de vote',1),(v_id,'cause','Absence de journalisation infalsifiable',2),
    (v_id,'consequence','Doute sur la sincérité du scrutin',0),(v_id,'consequence','Contestation des résultats',1),(v_id,'consequence','Tensions politiques',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Compromission des données biométriques d''inscription', 'data_protection', 2, 4, 'Données biométriques centralisées, chiffrement partiel, prestataires d''enrôlement.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Vol de la base biométrique',0),(v_id,'cause','Prestataire d''enrôlement peu sûr',1),(v_id,'cause','Transfert non chiffré',2),
    (v_id,'consequence','Usurpation d''identité durable',0),(v_id,'consequence','Atteinte irréversible à la vie privée',1),(v_id,'consequence','Perte de confiance dans le processus',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Déni de service sur la transmission des résultats', 'resilience', 3, 4, 'Chaîne de remontée des résultats sans secours ni filtrage.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Saturation volontaire des serveurs',0),(v_id,'cause','Absence de protection anti-DDoS',1),(v_id,'cause','Capacité insuffisante',2),
    (v_id,'consequence','Retard dans la publication des résultats',0),(v_id,'consequence','Rumeurs et contestation',1),(v_id,'consequence','Crise de confiance',2);

  -- ===== Statistique nationale =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Statistique nationale']::text[], 'Altération des données du recensement', 'integrity', 2, 4, 'Chaîne de collecte mobile peu contrôlée, agrégation sans contrôle de cohérence.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Falsification lors de la collecte',0),(v_id,'cause','Manipulation à l''agrégation',1),(v_id,'cause','Absence de contrôle de cohérence',2),
    (v_id,'consequence','Statistiques faussées',0),(v_id,'consequence','Mauvaise allocation des ressources',1),(v_id,'consequence','Décisions publiques biaisées',2);

  -- ===== Collectivités territoriales =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Collectivités territoriales']::text[], 'Rançongiciel paralysant une mairie', 'resilience', 3, 3, 'SI communal peu maintenu, sauvegardes absentes, budget cyber faible.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Poste infecté',0),(v_id,'cause','Absence de sauvegarde isolée',1),(v_id,'cause','Absence de maintenance',2),
    (v_id,'consequence','Arrêt de l''état civil local',0),(v_id,'consequence','Perte d''actes et de registres',1),(v_id,'consequence','Reconstruction difficile',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Collectivités territoriales']::text[], 'Détournement de la fiscalité locale', 'integrity', 3, 3, 'Encaissements peu traçables, contrôles de régie faibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Encaissements non enregistrés',0),(v_id,'cause','Falsification des quittances',1),(v_id,'cause','Absence de rapprochement',2),
    (v_id,'consequence','Perte de recettes locales',0),(v_id,'consequence','Services locaux sous-financés',1),(v_id,'consequence','Défiance des administrés',2);

  -- ===== Infrastructure numérique de l'État =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Compromission du centre de données national', 'security', 2, 4, 'Hébergement mutualisé, cloisonnement entre administrations insuffisant.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Intrusion sur la couche de virtualisation',0),(v_id,'cause','Mouvement latéral entre services',1),(v_id,'cause','Comptes d''administration partagés',2),
    (v_id,'consequence','Compromission de multiples services de l''État',0),(v_id,'consequence','Effet domino',1),(v_id,'consequence','Indisponibilité généralisée',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Compromission de l''autorité de certification de l''État', 'integrity', 2, 4, 'Clés de l''infrastructure de confiance insuffisamment protégées.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Vol d''une clé privée',0),(v_id,'cause','Émission de certificats frauduleux',1),(v_id,'cause','Module de sécurité mal configuré',2),
    (v_id,'consequence','Usurpation de services officiels',0),(v_id,'consequence','Signatures électroniques non fiables',1),(v_id,'consequence','Perte de confiance systémique',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Fuite via un prestataire cloud ou un sous-traitant', 'governance', 3, 3, 'Chaîne de sous-traitance peu encadrée, données hébergées hors maîtrise.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Prestataire compromis',0),(v_id,'cause','Clause de sécurité absente',1),(v_id,'cause','Données hébergées à l''étranger sans encadrement',2),
    (v_id,'consequence','Fuite de données publiques',0),(v_id,'consequence','Perte de maîtrise et de souveraineté',1),(v_id,'consequence','Non-conformité',2);

  -- ===== Énergie =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Énergie']::text[], 'Cyberattaque sur le pilotage du réseau électrique', 'resilience', 2, 4, 'Systèmes industriels connectés, segmentation entre bureautique et conduite faible.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Intrusion via le réseau bureautique',0),(v_id,'cause','Accès distant mal sécurisé',1),(v_id,'cause','Absence de segmentation',2),
    (v_id,'consequence','Coupures d''électricité en cascade',0),(v_id,'consequence','Hôpitaux, eau et télécoms perturbés',1),(v_id,'consequence','Pertes économiques majeures',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Énergie']::text[], 'Aggravation du délestage par défaillance du système de conduite', 'resilience', 3, 3, 'Système de conduite vieillissant, maintenance difficile.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Panne du système de conduite',0),(v_id,'cause','Perte de télémesure',1),(v_id,'cause','Procédures manuelles insuffisantes',2),
    (v_id,'consequence','Délestage prolongé',0),(v_id,'consequence','Impact sur l''activité économique',1),(v_id,'consequence','Mécontentement de la population',2);

  -- ===== Eau / Assainissement =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Eau / Assainissement']::text[], 'Compromission du pilotage de la distribution d''eau', 'resilience', 2, 4, 'Télégestion accessible à distance, supervision peu durcie.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Accès distant compromis',0),(v_id,'cause','Modification des consignes',1),(v_id,'cause','Absence de supervision de sécurité',2),
    (v_id,'consequence','Coupures ou surpressions',0),(v_id,'consequence','Risque sanitaire pour la population',1),(v_id,'consequence','Tensions sociales',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Eau / Assainissement']::text[], 'Altération des données de qualité de l''eau', 'integrity', 2, 4, 'Capteurs et chaînes de mesure peu protégés.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Manipulation des mesures',0),(v_id,'cause','Capteurs compromis',1),(v_id,'cause','Absence de contrôle d''intégrité',2),
    (v_id,'consequence','Dissimulation d''une contamination',0),(v_id,'consequence','Risque pour la santé publique',1),(v_id,'consequence','Perte de confiance',2);

  -- ===== Télécommunications =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Télécommunications']::text[], 'Rupture des câbles sous-marins et perte de connectivité', 'resilience', 2, 4, 'Dépendance à un faible nombre de câbles, secours insuffisant.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Coupure d''un câble sous-marin',0),(v_id,'cause','Absence de route de secours',1),(v_id,'cause','Capacité satellitaire insuffisante',2),
    (v_id,'consequence','Internet fortement dégradé à l''échelle nationale',0),(v_id,'consequence','Services bancaires et publics perturbés',1),(v_id,'consequence','Pertes économiques étendues',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Télécommunications']::text[], 'Fraude par échange de carte SIM', 'human_factor', 4, 3, 'Procédures d''identification en boutique faibles, complicités possibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Usurpation d''identité en boutique',0),(v_id,'cause','Complicité d''un agent',1),(v_id,'cause','Absence de contrôle renforcé',2),
    (v_id,'consequence','Vol de comptes mobile money et bancaires',0),(v_id,'consequence','Perte financière pour les abonnés',1),(v_id,'consequence','Atteinte à la confiance',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Télécommunications']::text[], 'Fuite massive de données d''abonnés', 'data_protection', 3, 4, 'Données d''abonnés centralisées, cloisonnement insuffisant.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Exfiltration après intrusion',0),(v_id,'cause','Accès interne abusif',1),(v_id,'cause','Absence de chiffrement',2),
    (v_id,'consequence','Exposition de données personnelles de masse',0),(v_id,'consequence','Arnaques et usurpations',1),(v_id,'consequence','Sanction du régulateur',2);

  -- ===== Transport =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Transport']::text[], 'Compromission du système de péage autoroutier', 'integrity', 2, 3, 'Système de péage interconnecté, contrôles de recette faibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Manipulation des transactions',0),(v_id,'cause','Accès non autorisé au système',1),(v_id,'cause','Absence de rapprochement des recettes',2),
    (v_id,'consequence','Perte de recettes',0),(v_id,'consequence','Indisponibilité des voies',1),(v_id,'consequence','Contentieux avec le concessionnaire',2);

  -- ===== Ports =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Ports']::text[], 'Rançongiciel sur le système communautaire portuaire', 'resilience', 3, 4, 'Nombreux acteurs interconnectés, maillon faible chez un opérateur.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Intrusion via un transitaire',0),(v_id,'cause','Propagation dans le guichet unique',1),(v_id,'cause','Sauvegardes insuffisantes',2),
    (v_id,'consequence','Blocage des opérations portuaires',0),(v_id,'consequence','Congestion et surcoûts logistiques',1),(v_id,'consequence','Pénuries en cascade',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Ports']::text[], 'Manipulation des données de conteneurs à des fins de trafic', 'integrity', 3, 4, 'Accès au système de suivi des conteneurs détourné.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Accès complice au système de suivi',0),(v_id,'cause','Modification des statuts de conteneurs',1),(v_id,'cause','Effacement des traces',2),
    (v_id,'consequence','Sortie frauduleuse de marchandises',0),(v_id,'consequence','Trafics facilités',1),(v_id,'consequence','Atteinte à la sûreté',2);

  -- ===== Aéroports / Aviation civile =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Aéroports / Aviation civile']::text[], 'Perturbation des systèmes de navigation aérienne', 'resilience', 2, 4, 'Systèmes critiques sensibles, maintenance complexe, espace aérien partagé.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Panne ou attaque sur un système critique',0),(v_id,'cause','Interférence sur les communications',1),(v_id,'cause','Procédures dégradées insuffisantes',2),
    (v_id,'consequence','Retards et déroutements',0),(v_id,'consequence','Risque pour la sécurité aérienne',1),(v_id,'consequence','Impact régional',2);

  -- ===== Santé publique =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Santé publique']::text[], 'Rançongiciel paralysant un hôpital', 'resilience', 3, 4, 'Équipements biomédicaux connectés non maintenus, sauvegardes faibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Poste de soin infecté',0),(v_id,'cause','Équipement biomédical vulnérable',1),(v_id,'cause','Absence de sauvegarde isolée',2),
    (v_id,'consequence','Report d''interventions et de soins',0),(v_id,'consequence','Risque vital pour des patients',1),(v_id,'consequence','Perte de dossiers médicaux',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Santé publique']::text[], 'Fuite de données médicales de patients', 'data_protection', 3, 4, 'Dossiers patients peu cloisonnés, accès trop larges.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Accès interne abusif',0),(v_id,'cause','Exfiltration de dossiers',1),(v_id,'cause','Absence de chiffrement',2),
    (v_id,'consequence','Exposition de données de santé sensibles',0),(v_id,'consequence','Chantage et discrimination',1),(v_id,'consequence','Perte de confiance',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Santé publique']::text[], 'Altération de la chaîne du froid des vaccins', 'integrity', 2, 3, 'Télésurveillance de la chaîne du froid peu protégée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Manipulation des relevés de température',0),(v_id,'cause','Capteurs compromis',1),(v_id,'cause','Absence d''alerte fiable',2),
    (v_id,'consequence','Vaccins rendus inefficaces',0),(v_id,'consequence','Risque pour les campagnes de vaccination',1),(v_id,'consequence','Gaspillage de ressources',2);

  -- ===== Protection sociale =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Protection sociale']::text[], 'Détournement des transferts monétaires aux ménages', 'integrity', 3, 3, 'Listes de bénéficiaires peu fiables, contrôles faibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Bénéficiaires fictifs',0),(v_id,'cause','Détournement de paiements mobiles',1),(v_id,'cause','Absence de rapprochement',2),
    (v_id,'consequence','Détournement de l''aide sociale',0),(v_id,'consequence','Exclusion des vrais bénéficiaires',1),(v_id,'consequence','Perte de confiance dans le programme',2);

  -- ===== Éducation / Formation =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Éducation / Formation']::text[], 'Fuite des sujets d''examens nationaux', 'integrity', 4, 3, 'Circuit de confection et de diffusion des sujets peu sécurisé.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Accès non contrôlé aux sujets',0),(v_id,'cause','Fuite par un intervenant',1),(v_id,'cause','Diffusion sur les réseaux',2),
    (v_id,'consequence','Annulation d''épreuves',0),(v_id,'consequence','Perte de crédibilité des diplômes',1),(v_id,'consequence','Coût de réorganisation',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Éducation / Formation']::text[], 'Manipulation des notes et des résultats', 'integrity', 3, 3, 'Système de gestion scolaire avec droits trop larges.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Modification frauduleuse des notes',0),(v_id,'cause','Accès non tracé',1),(v_id,'cause','Absence de contrôle',2),
    (v_id,'consequence','Résultats faussés',0),(v_id,'consequence','Injustice entre candidats',1),(v_id,'consequence','Contentieux',2);

  -- ===== Agriculture / Élevage / Pêche =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Agriculture / Élevage / Pêche']::text[], 'Fraude sur les subventions et intrants agricoles', 'integrity', 3, 3, 'Enregistrement des producteurs peu fiable, contrôles faibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Producteurs fictifs',0),(v_id,'cause','Détournement de coupons électroniques',1),(v_id,'cause','Collusion locale',2),
    (v_id,'consequence','Détournement des subventions',0),(v_id,'consequence','Exclusion des petits producteurs',1),(v_id,'consequence','Perte budgétaire',2);

  -- ===== Environnement =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Environnement']::text[], 'Falsification des données de surveillance environnementale', 'integrity', 2, 3, 'Capteurs et chaînes de mesure peu protégés.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Manipulation des mesures',0),(v_id,'cause','Capteurs compromis',1),(v_id,'cause','Absence de contrôle d''intégrité',2),
    (v_id,'consequence','Décisions environnementales biaisées',0),(v_id,'consequence','Dissimulation de pollutions',1),(v_id,'consequence','Perte de crédibilité',2);

  -- ===== Administration publique =====
  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Administration publique']::text[], 'Compromission de la messagerie gouvernementale', 'security', 3, 3, 'Messagerie peu protégée, absence d''authentification forte.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Hameçonnage d''un agent',0),(v_id,'cause','Absence d''authentification forte',1),(v_id,'cause','Mots de passe réutilisés',2),
    (v_id,'consequence','Accès frauduleux aux échanges officiels',0),(v_id,'consequence','Fraude au président ou au virement',1),(v_id,'consequence','Fuite d''informations sensibles',2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Administration publique']::text[], 'Services numériques non homologués dans l''administration', 'governance', 3, 2, 'Usage d''outils personnels et de cloud non validés pour des données sensibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id,'cause','Outils grand public pour des données sensibles',0),(v_id,'cause','Absence d''homologation',1),(v_id,'cause','Faible sensibilisation',2),
    (v_id,'consequence','Fuite de données par des services tiers',0),(v_id,'consequence','Perte de maîtrise',1),(v_id,'consequence','Non-conformité',2);

end $$;
