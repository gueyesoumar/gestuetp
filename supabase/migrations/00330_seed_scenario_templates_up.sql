-- 00330 - Seed du catalogue plateforme de modèles de scénarios (secteur public Sénégal / Afrique).
-- 79 modèles (owner_org_id = null), ancrés sur des incidents réels et un benchmark international.
-- Idempotent : ne seede pas si des modèles plateforme existent déjà.

do $$
declare v_id uuid;
begin
  if exists (select 1 from public.risk_scenario_templates where owner_org_id is null) then
    return;
  end if;

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Rançongiciel paralysant les services publics', 'security', 4, 4, 'Postes et serveurs non mis à jour, sauvegardes non isolées du réseau.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Pièce jointe piégée ouverte par un agent', 0),
    (v_id, 'cause', 'Serveur exposé non corrigé', 1),
    (v_id, 'cause', 'Absence de segmentation réseau', 2),
    (v_id, 'consequence', 'Arrêt total des services aux usagers', 0),
    (v_id, 'consequence', 'Perte ou chiffrement des données', 1),
    (v_id, 'consequence', 'Reconstruction coûteuse', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Fuite massive de données citoyennes sur le dark web', 'data_protection', 3, 4, 'Données personnelles stockées en clair, cloisonnement insuffisant.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Exfiltration après intrusion', 0),
    (v_id, 'cause', 'Base de données exposée sur Internet', 1),
    (v_id, 'cause', 'Absence de chiffrement au repos', 2),
    (v_id, 'consequence', 'Atteinte à la vie privée de millions d''usagers', 0),
    (v_id, 'consequence', 'Usurpation d''identité en chaîne', 1),
    (v_id, 'consequence', 'Sanction CDP et perte de confiance', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Défiguration de site gouvernemental par hacktivisme', 'security', 2, 2, 'Sites institutionnels sous CMS obsolètes, peu surveillés.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Faille applicative du site vitrine', 0),
    (v_id, 'cause', 'CMS non mis à jour', 1),
    (v_id, 'cause', 'Motivation politique ou religieuse', 2),
    (v_id, 'consequence', 'Message revendicatif affiché publiquement', 0),
    (v_id, 'consequence', 'Atteinte à l''image de l''État', 1),
    (v_id, 'consequence', 'Doute sur la fiabilité du site', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Déni de service distribué sur les portails publics', 'resilience', 3, 3, 'Pas de filtrage amont ni de bascule de capacité.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Flot de trafic malveillant', 0),
    (v_id, 'cause', 'Absence de protection anti-DDoS', 1),
    (v_id, 'cause', 'Hébergement sous-dimensionné', 2),
    (v_id, 'consequence', 'Indisponibilité des téléservices', 0),
    (v_id, 'consequence', 'Interruption des démarches des usagers', 1),
    (v_id, 'consequence', 'Mobilisation d''urgence des équipes', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Interruption de service liée aux coupures électriques et au délestage', 'resilience', 4, 3, 'Salles serveurs sans alimentation de secours testée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Coupure du réseau électrique', 0),
    (v_id, 'cause', 'Onduleurs sous-dimensionnés ou en panne', 1),
    (v_id, 'cause', 'Absence de groupe électrogène entretenu', 2),
    (v_id, 'consequence', 'Arrêt brutal des serveurs', 0),
    (v_id, 'consequence', 'Corruption de bases de données', 1),
    (v_id, 'consequence', 'Indisponibilité prolongée des services', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Hameçonnage et compromission de comptes d''agents', 'human_factor', 4, 3, 'Comptes sans MFA, agents non formés aux alertes.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Courriel d''hameçonnage ciblé', 0),
    (v_id, 'cause', 'Absence d''authentification forte', 1),
    (v_id, 'cause', 'Réutilisation de mots de passe', 2),
    (v_id, 'consequence', 'Accès frauduleux aux applications métier', 0),
    (v_id, 'consequence', 'Pivot vers le cœur du SI', 1),
    (v_id, 'consequence', 'Fuite ou altération de données', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Comptes d''agents partis laissés actifs', 'human_factor', 3, 3, 'Gestion des habilitations manuelle et non revue périodiquement.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Absence de procédure de révocation', 0),
    (v_id, 'cause', 'Rotation et mutations fréquentes', 1),
    (v_id, 'cause', 'Comptes partagés non nominatifs', 2),
    (v_id, 'consequence', 'Accès non autorisé persistant', 0),
    (v_id, 'consequence', 'Exfiltration par ancien agent', 1),
    (v_id, 'consequence', 'Impossibilité d''imputer les actions', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Dépendance à un hébergeur ou cloud étranger', 'third_party', 3, 4, 'Données sensibles de l''État hébergées hors du territoire national.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Absence d''hébergement souverain', 0),
    (v_id, 'cause', 'Contrats sans clause de localisation', 1),
    (v_id, 'cause', 'Dépendance à un fournisseur unique', 2),
    (v_id, 'consequence', 'Perte de maîtrise des données', 0),
    (v_id, 'consequence', 'Accès possible par une juridiction étrangère', 1),
    (v_id, 'consequence', 'Indisponibilité en cas de litige fournisseur', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Absence de sauvegardes testées et perte définitive de données', 'resilience', 3, 4, 'Aucune copie hors ligne ni plan de reprise éprouvé.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Pas de politique de sauvegarde', 0),
    (v_id, 'cause', 'Sauvegardes connectées au réseau', 1),
    (v_id, 'cause', 'Restaurations jamais testées', 2),
    (v_id, 'consequence', 'Perte définitive de registres publics', 0),
    (v_id, 'consequence', 'Reconstruction manuelle très coûteuse', 1),
    (v_id, 'consequence', 'Interruption durable des services', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Systèmes et logiciels obsolètes non corrigés', 'security', 4, 3, 'Parc non inventorié, pas de cycle de mise à jour.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Systèmes en fin de support', 0),
    (v_id, 'cause', 'Absence de gestion des correctifs', 1),
    (v_id, 'cause', 'Applications métier figées', 2),
    (v_id, 'consequence', 'Exploitation de failles connues', 0),
    (v_id, 'consequence', 'Intrusion facilitée', 1),
    (v_id, 'consequence', 'Propagation rapide d''un maliciel', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Compromission via un prestataire d''infogérance', 'third_party', 2, 4, 'Accès prestataires permanents, sans MFA ni journalisation dédiée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès distant prestataire non maîtrisé', 0),
    (v_id, 'cause', 'Absence de clauses de sécurité au contrat', 1),
    (v_id, 'cause', 'Prestataire lui-même peu sécurisé', 2),
    (v_id, 'consequence', 'Intrusion par un canal de confiance', 0),
    (v_id, 'consequence', 'Propagation à plusieurs administrations', 1),
    (v_id, 'consequence', 'Difficulté d''attribution et de réponse', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Traitement de données personnelles sans conformité à la loi 2008-12', 'governance', 3, 3, 'Gouvernance des données personnelles non formalisée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Absence de déclaration à la CDP', 0),
    (v_id, 'cause', 'Collecte sans base légale ni information', 1),
    (v_id, 'cause', 'Durée de conservation non définie', 2),
    (v_id, 'consequence', 'Sanction de la CDP', 0),
    (v_id, 'consequence', 'Contentieux des usagers', 1),
    (v_id, 'consequence', 'Retrait ou blocage du traitement', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Absence de journalisation des accès et des actions', 'verifiability', 3, 3, 'Aucune piste d''audit sur les applications sensibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Journalisation non activée', 0),
    (v_id, 'cause', 'Journaux non centralisés ni horodatés', 1),
    (v_id, 'cause', 'Pas de revue des traces', 2),
    (v_id, 'consequence', 'Incidents non détectés', 0),
    (v_id, 'consequence', 'Impossibilité de preuve en cas d''enquête', 1),
    (v_id, 'consequence', 'Fraude interne indétectable', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values ('{}'::text[], 'Gouvernance de la sécurité absente ou immature', 'governance', 3, 3, 'Responsabilités SSI non attribuées au sein de l''organisation.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Pas de RSSI désigné', 0),
    (v_id, 'cause', 'Absence de PSSI interne', 1),
    (v_id, 'cause', 'Budget sécurité inexistant', 2),
    (v_id, 'consequence', 'Vulnérabilités non traitées', 0),
    (v_id, 'consequence', 'Non-conformité réglementaire', 1),
    (v_id, 'consequence', 'Décisions non arbitrées', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Administration publique']::text[], 'Usurpation de la messagerie d''un haut responsable (fraude au virement)', 'human_factor', 3, 3, 'Messagerie sans MFA ni procédure de contre-appel.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Compte de messagerie compromis', 0),
    (v_id, 'cause', 'Absence de vérification des ordres', 1),
    (v_id, 'cause', 'Usurpation d''adresse proche', 2),
    (v_id, 'consequence', 'Virement frauduleux', 0),
    (v_id, 'consequence', 'Décisions prises sur ordre falsifié', 1),
    (v_id, 'consequence', 'Atteinte à l''autorité du responsable', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Administration publique']::text[], 'Vol ou perte de matériel non chiffré', 'data_protection', 3, 3, 'Absence de chiffrement du disque sur les postes mobiles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Poste ou disque non chiffré', 0),
    (v_id, 'cause', 'Vol de matériel', 1),
    (v_id, 'cause', 'Perte en déplacement', 2),
    (v_id, 'consequence', 'Accès direct aux données stockées', 0),
    (v_id, 'consequence', 'Fuite de dossiers sensibles', 1),
    (v_id, 'consequence', 'Notification obligatoire à la CDP', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Administration publique']::text[], 'Shadow IT et applications non homologuées', 'governance', 3, 2, 'Pas de politique d''usage ni d''inventaire des applications.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Besoin métier non couvert', 0),
    (v_id, 'cause', 'Usage d''outils personnels gratuits', 1),
    (v_id, 'cause', 'Absence de catalogue applicatif', 2),
    (v_id, 'consequence', 'Données publiques sur des services non maîtrisés', 0),
    (v_id, 'consequence', 'Perte de confidentialité', 1),
    (v_id, 'consequence', 'Impossibilité de contrôle', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Fiscalité']::text[], 'Exfiltration des données fiscales des contribuables', 'data_protection', 3, 4, 'Données fiscales non chiffrées, accès trop larges.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Intrusion dans les bases fiscales', 0),
    (v_id, 'cause', 'Compte agent compromis', 1),
    (v_id, 'cause', 'Base exposée ou mal cloisonnée', 2),
    (v_id, 'consequence', 'Fuite des revenus et patrimoines des contribuables', 0),
    (v_id, 'consequence', 'Usurpation et hameçonnage ciblé', 1),
    (v_id, 'consequence', 'Perte de confiance dans l''impôt', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Fiscalité']::text[], 'Fraude fiscale par manipulation interne du système', 'integrity', 3, 4, 'Modifications sensibles sans double validation ni traçabilité.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès privilégié détourné par un agent', 0),
    (v_id, 'cause', 'Absence de séparation des tâches', 1),
    (v_id, 'cause', 'Pas de revue des modifications', 2),
    (v_id, 'consequence', 'Minoration frauduleuse de l''impôt', 0),
    (v_id, 'consequence', 'Crédits de taxe fictifs', 1),
    (v_id, 'consequence', 'Pertes de recettes publiques', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Fiscalité']::text[], 'Minoration frauduleuse des impôts dans les bases de recouvrement', 'integrity', 2, 4, 'Pas de contrôle d''intégrité ni de rapprochement automatique des montants.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Injection ou modification en base', 0),
    (v_id, 'cause', 'Contrôles d''intégrité absents', 1),
    (v_id, 'cause', 'Collusion externe-interne', 2),
    (v_id, 'consequence', 'Pertes de recettes fiscales', 0),
    (v_id, 'consequence', 'Inéquité entre contribuables', 1),
    (v_id, 'consequence', 'Contentieux et redressements massifs', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Douanes']::text[], 'Vol d''identifiants de déclarants dans le système de dédouanement', 'human_factor', 3, 4, 'Identifiants d''opérateurs réutilisables sans contrôle fort.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Identifiants déclarants réutilisés ou volés', 0),
    (v_id, 'cause', 'Absence d''authentification forte', 1),
    (v_id, 'cause', 'Complicité de transitaires', 2),
    (v_id, 'consequence', 'Dédouanements frauduleux sous fausse identité', 0),
    (v_id, 'consequence', 'Pertes de droits et de taxes', 1),
    (v_id, 'consequence', 'Non-paiement d''impôts associés', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Douanes']::text[], 'Manipulation de déclarations douanières pour minorer les droits', 'integrity', 3, 4, 'Contrôles automatiques et croisements de données insuffisants.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Fausse déclaration de valeur ou d''espèce', 0),
    (v_id, 'cause', 'Altération des données saisies', 1),
    (v_id, 'cause', 'Collusion agent-opérateur', 2),
    (v_id, 'consequence', 'Minoration des droits et taxes', 0),
    (v_id, 'consequence', 'Entrée de marchandises prohibées', 1),
    (v_id, 'consequence', 'Blanchiment via le commerce', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Douanes']::text[], 'Indisponibilité du système de dédouanement bloquant le port', 'resilience', 3, 4, 'Pas de mode dégradé ni de site de secours pour le dédouanement.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Panne ou rançongiciel sur le système', 0),
    (v_id, 'cause', 'Coupure électrique prolongée', 1),
    (v_id, 'cause', 'Absence de plan de continuité', 2),
    (v_id, 'consequence', 'Blocage des flux au port', 0),
    (v_id, 'consequence', 'Engorgement et surcoûts logistiques', 1),
    (v_id, 'consequence', 'Perte de recettes douanières quotidiennes', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Trésor / Finances publiques']::text[], 'Fuite massive de données du Trésor public', 'data_protection', 3, 4, 'Données sensibles concentrées et non chiffrées.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Intrusion dans les systèmes du Trésor', 0),
    (v_id, 'cause', 'Exfiltration de documents financiers', 1),
    (v_id, 'cause', 'Absence de cloisonnement des données', 2),
    (v_id, 'consequence', 'Exposition de données financières de l''État et des usagers', 0),
    (v_id, 'consequence', 'Diffusion sur le dark web', 1),
    (v_id, 'consequence', 'Atteinte majeure à la confiance', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Trésor / Finances publiques']::text[], 'Détournement de fonds par fraude sur la chaîne de la dépense', 'integrity', 2, 4, 'Validation des paiements sans séparation stricte des rôles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Ordre de paiement falsifié', 0),
    (v_id, 'cause', 'Compte compromis dans la chaîne de la dépense', 1),
    (v_id, 'cause', 'Absence de contrôle à quatre yeux', 2),
    (v_id, 'consequence', 'Détournement de fonds publics', 0),
    (v_id, 'consequence', 'Paiements vers des comptes frauduleux', 1),
    (v_id, 'consequence', 'Pertes irrécupérables', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Trésor / Finances publiques']::text[], 'Falsification des écritures comptables publiques', 'integrity', 2, 4, 'Écritures modifiables sans trace scellée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Modification non autorisée en base', 0),
    (v_id, 'cause', 'Absence de journal inaltérable', 1),
    (v_id, 'cause', 'Collusion interne', 2),
    (v_id, 'consequence', 'Comptes publics non fiables', 0),
    (v_id, 'consequence', 'Masquage de détournements', 1),
    (v_id, 'consequence', 'Réserves de la Cour des comptes', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Justice']::text[], 'Fuite de dossiers judiciaires et de pièces scellées', 'data_protection', 2, 4, 'Dossiers sensibles accessibles sans cloisonnement par affaire.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Intrusion dans le système de gestion des affaires', 0),
    (v_id, 'cause', 'Accès trop large aux dossiers', 1),
    (v_id, 'cause', 'Exfiltration ciblée', 2),
    (v_id, 'consequence', 'Exposition de témoins et de victimes', 0),
    (v_id, 'consequence', 'Compromission d''enquêtes en cours', 1),
    (v_id, 'consequence', 'Atteinte à la sécurité des personnes', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Justice']::text[], 'Rançongiciel paralysant les greffes et les audiences', 'resilience', 3, 4, 'Dépendance à un SI unique sans plan de reprise.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Rançongiciel sur les serveurs de juridiction', 0),
    (v_id, 'cause', 'Absence de sauvegarde isolée', 1),
    (v_id, 'cause', 'Système unique sans redondance', 2),
    (v_id, 'consequence', 'Report des audiences', 0),
    (v_id, 'consequence', 'Blocage des greffes', 1),
    (v_id, 'consequence', 'Perte de dossiers numérisés', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Justice']::text[], 'Altération de décisions de justice numérisées', 'integrity', 2, 4, 'Décisions et registres modifiables sans horodatage inaltérable.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès privilégié détourné', 0),
    (v_id, 'cause', 'Absence de scellement des décisions', 1),
    (v_id, 'cause', 'Collusion interne', 2),
    (v_id, 'consequence', 'Décisions falsifiées', 0),
    (v_id, 'consequence', 'Casier judiciaire altéré', 1),
    (v_id, 'consequence', 'Perte de confiance dans la justice', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Défense / Sécurité intérieure']::text[], 'Exfiltration des données du personnel de défense et de sécurité', 'data_protection', 2, 4, 'Données de personnels sensibles non segmentées ni chiffrées.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Intrusion dans les bases RH de défense', 0),
    (v_id, 'cause', 'Accès mal cloisonné', 1),
    (v_id, 'cause', 'Exfiltration massive', 2),
    (v_id, 'consequence', 'Exposition de personnels sensibles', 0),
    (v_id, 'consequence', 'Ciblage et chantage', 1),
    (v_id, 'consequence', 'Atteinte à la sécurité nationale', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Défense / Sécurité intérieure']::text[], 'Espionnage persistant (APT) sur les systèmes de défense', 'security', 2, 4, 'Détection d''intrusion avancée absente, segmentation insuffisante.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Intrusion sophistiquée et furtive', 0),
    (v_id, 'cause', 'Compromission d''un poste ou d''un prestataire', 1),
    (v_id, 'cause', 'Absence de détection avancée', 2),
    (v_id, 'consequence', 'Vol de renseignements stratégiques', 0),
    (v_id, 'consequence', 'Présence durable non détectée', 1),
    (v_id, 'consequence', 'Compromission d''opérations', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Fuite du fichier électoral ou du registre national d''identité', 'data_protection', 3, 4, 'Registre national centralisé sans chiffrement ni cloisonnement.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Intrusion dans la base nationale', 0),
    (v_id, 'cause', 'Accès prestataire mal maîtrisé', 1),
    (v_id, 'cause', 'Données non chiffrées', 2),
    (v_id, 'consequence', 'Exposition des données de tous les citoyens', 0),
    (v_id, 'consequence', 'Usurpation d''identité de masse', 1),
    (v_id, 'consequence', 'Atteinte à la souveraineté', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Compromission de la base biométrique nationale', 'data_protection', 2, 4, 'Gabarits biométriques non chiffrés et faiblement cloisonnés.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Intrusion sur les serveurs d''enrôlement', 0),
    (v_id, 'cause', 'Biométrie stockée sans chiffrement', 1),
    (v_id, 'cause', 'Supports d''enrôlement non protégés', 2),
    (v_id, 'consequence', 'Exposition irréversible de données biométriques', 0),
    (v_id, 'consequence', 'Falsification d''identité', 1),
    (v_id, 'consequence', 'Perte de confiance dans l''identification nationale', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Rançongiciel bloquant la délivrance des titres d''identité', 'resilience', 3, 4, 'Chaîne de production des titres reposant sur un SI unique.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Rançongiciel sur le système d''automatisation des fichiers', 0),
    (v_id, 'cause', 'Absence de continuité', 1),
    (v_id, 'cause', 'Sauvegardes non isolées', 2),
    (v_id, 'consequence', 'Suspension de la délivrance des CNI et passeports', 0),
    (v_id, 'consequence', 'Citoyens sans titres valides', 1),
    (v_id, 'consequence', 'Blocage de démarches liées', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Altération du fichier électoral (électeurs ou bureaux fictifs)', 'integrity', 2, 4, 'Fichier électoral modifiable sans audit d''intégrité indépendant.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Modification non autorisée du fichier', 0),
    (v_id, 'cause', 'Absence de contrôle d''intégrité', 1),
    (v_id, 'cause', 'Collusion interne', 2),
    (v_id, 'consequence', 'Inscriptions ou bureaux fictifs', 0),
    (v_id, 'consequence', 'Contestation des résultats', 1),
    (v_id, 'consequence', 'Crise de légitimité', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Campagne de désinformation sur l''intégrité du scrutin', 'governance', 3, 3, 'Absence de communication de crise et de canal officiel fiable.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Diffusion de fausses informations', 0),
    (v_id, 'cause', 'Faux documents ou captures', 1),
    (v_id, 'cause', 'Exploitation d''un incident mineur', 2),
    (v_id, 'consequence', 'Défiance envers le processus électoral', 0),
    (v_id, 'consequence', 'Tensions sociales', 1),
    (v_id, 'consequence', 'Contestation des résultats', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Élections / État civil']::text[], 'Altération des registres d''état civil', 'integrity', 2, 4, 'Registres dématérialisés sans contrôle d''intégrité ni traçabilité.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Modification frauduleuse d''actes', 0),
    (v_id, 'cause', 'Absence de scellement des registres', 1),
    (v_id, 'cause', 'Accès non contrôlé des agents', 2),
    (v_id, 'consequence', 'Faux actes de naissance ou de décès', 0),
    (v_id, 'consequence', 'Fraude à l''identité et aux droits', 1),
    (v_id, 'consequence', 'Perte de fiabilité de l''état civil', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Statistique nationale']::text[], 'Faux communiqués et défiguration du site statistique', 'integrity', 2, 3, 'Canal de publication officiel non protégé ni authentifié.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Site compromis', 0),
    (v_id, 'cause', 'Publication de faux rapports', 1),
    (v_id, 'cause', 'CMS non sécurisé', 2),
    (v_id, 'consequence', 'Diffusion de statistiques falsifiées', 0),
    (v_id, 'consequence', 'Décisions économiques erronées', 1),
    (v_id, 'consequence', 'Atteinte à la crédibilité institutionnelle', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Statistique nationale']::text[], 'Fuite de données d''enquête et de recensement', 'data_protection', 2, 3, 'Microdonnées nominatives conservées sans anonymisation ni cloisonnement.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Base d''enquête exposée', 0),
    (v_id, 'cause', 'Accès trop large des enquêteurs', 1),
    (v_id, 'cause', 'Absence d''anonymisation', 2),
    (v_id, 'consequence', 'Violation du secret statistique', 0),
    (v_id, 'consequence', 'Exposition de données socio-économiques', 1),
    (v_id, 'consequence', 'Baisse de participation future', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Collectivités territoriales']::text[], 'Rançongiciel sur une collectivité peu dotée en sécurité', 'security', 3, 3, 'Faible maturité et budget sécurité quasi nul.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Absence d''équipe sécurité dédiée', 0),
    (v_id, 'cause', 'Postes non protégés', 1),
    (v_id, 'cause', 'Sauvegardes inexistantes', 2),
    (v_id, 'consequence', 'Arrêt des services municipaux', 0),
    (v_id, 'consequence', 'Perte des données locales', 1),
    (v_id, 'consequence', 'Rançon ou reconstruction coûteuse', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Collectivités territoriales']::text[], 'Détournement des recettes locales via le système de la régie', 'integrity', 2, 3, 'Régie informatisée sans contrôle interne ni traçabilité des opérations.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès non contrôlé au système de recettes', 0),
    (v_id, 'cause', 'Absence de séparation des tâches', 1),
    (v_id, 'cause', 'Pas de rapprochement des encaissements', 2),
    (v_id, 'consequence', 'Détournement de recettes locales', 0),
    (v_id, 'consequence', 'Minoration des recouvrements', 1),
    (v_id, 'consequence', 'Déséquilibre budgétaire communal', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Fuite massive de la base d''identité biométrique nationale', 'data_protection', 3, 4, 'Base centralisée sans chiffrement ni cloisonnement des accès d''administration.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès administrateur non cloisonné', 0),
    (v_id, 'cause', 'Dépôts de sauvegarde exposés', 1),
    (v_id, 'cause', 'Absence de chiffrement au repos', 2),
    (v_id, 'consequence', 'Usurpation d''identité de masse', 0),
    (v_id, 'consequence', 'Atteinte irréversible à la vie privée', 1),
    (v_id, 'consequence', 'Perte de confiance dans l''identité numérique', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Compromission de l''autorité de certification nationale (PKI)', 'integrity', 2, 4, 'Clé racine conservée en ligne sans module matériel de sécurité (HSM).', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Clé racine mal protégée', 0),
    (v_id, 'cause', 'Processus d''émission faible', 1),
    (v_id, 'cause', 'Supervision insuffisante de la PKI', 2),
    (v_id, 'consequence', 'Émission de faux certificats', 0),
    (v_id, 'consequence', 'Usurpation de services publics', 1),
    (v_id, 'consequence', 'Rupture de la chaîne de confiance', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Indisponibilité du datacenter national mutualisé', 'resilience', 3, 4, 'Absence de datacenter de secours géographiquement distinct.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Site unique sans réplication', 0),
    (v_id, 'cause', 'Incendie ou panne de climatisation', 1),
    (v_id, 'cause', 'Absence de site de secours', 2),
    (v_id, 'consequence', 'Interruption multi-administrations', 0),
    (v_id, 'consequence', 'Perte de données non répliquées', 1),
    (v_id, 'consequence', 'Effet domino sur l''e-gouvernement', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Défiguration et sabotage des portails e-gouvernement', 'security', 3, 3, 'Applications publiques exposées sans mises à jour régulières.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Composants web non à jour', 0),
    (v_id, 'cause', 'Absence de pare-feu applicatif', 1),
    (v_id, 'cause', 'Vulnérabilités d''injection', 2),
    (v_id, 'consequence', 'Interruption des téléservices', 0),
    (v_id, 'consequence', 'Atteinte à l''image de l''État', 1),
    (v_id, 'consequence', 'Diffusion de contenus malveillants', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Infrastructure numérique de l''État']::text[], 'Exfiltration de données internes de l''État et chantage à la publication', 'data_protection', 3, 4, 'Données sensibles non classifiées ni chiffrées sur partages internes.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Exfiltration avant chiffrement', 0),
    (v_id, 'cause', 'Partages de fichiers trop ouverts', 1),
    (v_id, 'cause', 'Détection tardive', 2),
    (v_id, 'consequence', 'Publication de documents sensibles', 0),
    (v_id, 'consequence', 'Chantage financier', 1),
    (v_id, 'consequence', 'Compromission de données d''agents', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Énergie']::text[], 'Intrusion dans le SCADA provoquant une coupure du réseau électrique', 'resilience', 3, 4, 'Interconnexion directe entre réseau bureautique et réseau industriel.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'IT et OT non segmentés', 0),
    (v_id, 'cause', 'Accès distant non sécurisé', 1),
    (v_id, 'cause', 'Automates obsolètes', 2),
    (v_id, 'consequence', 'Délestage non maîtrisé', 0),
    (v_id, 'consequence', 'Effet domino sur autres services', 1),
    (v_id, 'consequence', 'Dommages matériels sur le réseau', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Énergie']::text[], 'Manipulation des paramètres de production et de dispatching', 'integrity', 2, 4, 'Protocoles industriels sans authentification des commandes.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Consignes non authentifiées', 0),
    (v_id, 'cause', 'Accès maintenance privilégié', 1),
    (v_id, 'cause', 'Supervision OT faible', 2),
    (v_id, 'consequence', 'Déséquilibre du réseau', 0),
    (v_id, 'consequence', 'Endommagement d''équipements', 1),
    (v_id, 'consequence', 'Instabilité de la fourniture', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Énergie']::text[], 'Fraude sur le système de comptage prépayé et de facturation', 'integrity', 3, 3, 'Algorithme de génération de crédits insuffisamment protégé.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Génération illicite de jetons', 0),
    (v_id, 'cause', 'Accès interne non tracé', 1),
    (v_id, 'cause', 'Compteurs peu sécurisés', 2),
    (v_id, 'consequence', 'Pertes de revenus', 0),
    (v_id, 'consequence', 'Abonnés privés de recharge', 1),
    (v_id, 'consequence', 'Contentieux clients', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Énergie']::text[], 'Maintenance distante par le fournisseur OT étranger compromise', 'third_party', 3, 4, 'Télémaintenance permanente non encadrée ni journalisée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès permanent du fournisseur', 0),
    (v_id, 'cause', 'Absence de supervision des sessions', 1),
    (v_id, 'cause', 'Dépendance technique forte', 2),
    (v_id, 'consequence', 'Rebond vers le SCADA', 0),
    (v_id, 'consequence', 'Introduction de maliciel', 1),
    (v_id, 'consequence', 'Perte de contrôle du système', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Eau / Assainissement']::text[], 'Altération du dosage chimique via accès au SCADA de traitement', 'integrity', 2, 4, 'Postes de supervision accessibles à distance sans contrôle fort.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès distant non sécurisé', 0),
    (v_id, 'cause', 'Pas de seuils de sécurité automatiques', 1),
    (v_id, 'cause', 'Supervision humaine faible', 2),
    (v_id, 'consequence', 'Contamination de l''eau potable', 0),
    (v_id, 'consequence', 'Risque sanitaire de masse', 1),
    (v_id, 'consequence', 'Arrêt de la distribution', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Eau / Assainissement']::text[], 'Arrêt des stations de pompage et de traitement par rançongiciel', 'resilience', 3, 4, 'Dépendance d''automates critiques à une infrastructure IT vulnérable.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'IT et OT non cloisonnés', 0),
    (v_id, 'cause', 'Sauvegardes absentes', 1),
    (v_id, 'cause', 'Automates non supervisés', 2),
    (v_id, 'consequence', 'Interruption de la distribution', 0),
    (v_id, 'consequence', 'Débordement des eaux usées', 1),
    (v_id, 'consequence', 'Crise de santé publique', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Eau / Assainissement']::text[], 'Accès distant non maîtrisé aux automates de terrain', 'security', 3, 3, 'Outil de contrôle distant exposé sur Internet avec identifiants faibles.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Logiciel de télémaintenance exposé', 0),
    (v_id, 'cause', 'Mots de passe partagés', 1),
    (v_id, 'cause', 'Postes non à jour', 2),
    (v_id, 'consequence', 'Prise de contrôle des vannes et pompes', 0),
    (v_id, 'consequence', 'Modification des consignes', 1),
    (v_id, 'consequence', 'Point d''entrée persistant', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Télécommunications']::text[], 'Fuite massive des données d''abonnés de l''opérateur', 'data_protection', 3, 4, 'Référentiel abonnés accessible largement en interne sans chiffrement.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Base clients mal cloisonnée', 0),
    (v_id, 'cause', 'Accès interne excessif', 1),
    (v_id, 'cause', 'Absence de chiffrement', 2),
    (v_id, 'consequence', 'Revente des données', 0),
    (v_id, 'consequence', 'Fraude et usurpation en masse', 1),
    (v_id, 'consequence', 'Sanction de la CDP', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Télécommunications']::text[], 'Fraude par échange de carte SIM (SIM swap) et prise de comptes', 'integrity', 4, 3, 'Processus de réémission de SIM sans contrôle d''identité robuste.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Vérification d''identité faible en boutique', 0),
    (v_id, 'cause', 'Complicité interne', 1),
    (v_id, 'cause', 'Procédures non respectées', 2),
    (v_id, 'consequence', 'Détournement de comptes mobile money', 0),
    (v_id, 'consequence', 'Pertes financières clients', 1),
    (v_id, 'consequence', 'Contentieux et amendes', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Télécommunications']::text[], 'Divulgation de données internes du régulateur télécom après intrusion', 'data_protection', 3, 3, 'Boîtes courriel exposées sans authentification forte.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Messagerie non protégée', 0),
    (v_id, 'cause', 'Exfiltration non détectée', 1),
    (v_id, 'cause', 'Absence de MFA', 2),
    (v_id, 'consequence', 'Publication de courriels internes', 0),
    (v_id, 'consequence', 'Atteinte à la réputation', 1),
    (v_id, 'consequence', 'Chantage à la divulgation', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Télécommunications']::text[], 'Indisponibilité du cœur de réseau et de la résolution DNS', 'resilience', 2, 4, 'Absence de redondance sur des composants réseau centraux.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Erreur de configuration', 0),
    (v_id, 'cause', 'Attaque par déni de service', 1),
    (v_id, 'cause', 'Point de défaillance unique', 2),
    (v_id, 'consequence', 'Coupure nationale des communications', 0),
    (v_id, 'consequence', 'Blocage des services dépendants', 1),
    (v_id, 'consequence', 'Perte économique majeure', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Transport']::text[], 'Rançongiciel sur la billetterie et la signalisation ferroviaire', 'resilience', 3, 3, 'Interconnexion de systèmes d''exploitation critiques avec le réseau bureautique.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'SI billetterie exposé', 0),
    (v_id, 'cause', 'Signalisation interconnectée à l''IT', 1),
    (v_id, 'cause', 'Sauvegardes insuffisantes', 2),
    (v_id, 'consequence', 'Arrêt de l''exploitation', 0),
    (v_id, 'consequence', 'Dégradation de la sécurité des circulations', 1),
    (v_id, 'consequence', 'Pertes de recettes', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Transport']::text[], 'Manipulation des systèmes de gestion du trafic et des péages', 'integrity', 2, 3, 'Équipements de régulation du trafic sans protection d''accès.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Capteurs et panneaux non sécurisés', 0),
    (v_id, 'cause', 'Accès administration faible', 1),
    (v_id, 'cause', 'Données de transaction non intègres', 2),
    (v_id, 'consequence', 'Perturbation du trafic routier', 0),
    (v_id, 'consequence', 'Détournement de recettes de péage', 1),
    (v_id, 'consequence', 'Fausses informations aux usagers', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Ports']::text[], 'Rançongiciel paralysant le terminal et imposant un retour au papier', 'resilience', 3, 4, 'Dépendance totale des opérations à un SI non cloisonné.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'SI portuaire interconnecté', 0),
    (v_id, 'cause', 'Absence de segmentation', 1),
    (v_id, 'cause', 'Plan de continuité inexistant', 2),
    (v_id, 'consequence', 'Congestion et retards de fret', 0),
    (v_id, 'consequence', 'Procédures manuelles dégradées', 1),
    (v_id, 'consequence', 'Pertes économiques nationales', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Ports']::text[], 'Compromission du système communautaire portuaire et des manifestes', 'integrity', 2, 4, 'Système communautaire partagé sans contrôle d''intégrité des données.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès partenaires trop larges', 0),
    (v_id, 'cause', 'Manifestes non intègres', 1),
    (v_id, 'cause', 'Complicité interne', 2),
    (v_id, 'consequence', 'Détournement de conteneurs', 0),
    (v_id, 'consequence', 'Facilitation de trafics', 1),
    (v_id, 'consequence', 'Perte de contrôle douanier', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Ports']::text[], 'Fuite des données logistiques et commerciales sensibles', 'data_protection', 3, 3, 'Partage de données logistiques entre acteurs sans cloisonnement.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Multiplicité des intervenants', 0),
    (v_id, 'cause', 'Partage de fichiers non sécurisé', 1),
    (v_id, 'cause', 'Journalisation faible', 2),
    (v_id, 'consequence', 'Divulgation de données commerciales', 0),
    (v_id, 'consequence', 'Avantage concurrentiel détourné', 1),
    (v_id, 'consequence', 'Ciblage de cargaisons', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Aéroports / Aviation civile']::text[], 'Maliciel dans le réseau OT du contrôle aérien', 'security', 2, 4, 'Présence de maliciel dans un réseau de technologie opérationnelle critique.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'OT du contrôle aérien interconnecté', 0),
    (v_id, 'cause', 'Exfiltration non détectée', 1),
    (v_id, 'cause', 'Supervision OT limitée', 2),
    (v_id, 'consequence', 'Perturbation de la navigation aérienne', 0),
    (v_id, 'consequence', 'Exfiltration de données sensibles', 1),
    (v_id, 'consequence', 'Dégradation de la sécurité des vols', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Aéroports / Aviation civile']::text[], 'Rançongiciel sur le SI aéroportuaire avec vol de données passagers', 'data_protection', 3, 4, 'Données passagers centralisées sans protection renforcée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'SI exposé', 0),
    (v_id, 'cause', 'Absence de MFA', 1),
    (v_id, 'cause', 'Sauvegardes insuffisantes', 2),
    (v_id, 'consequence', 'Vol de données passagers et personnel', 0),
    (v_id, 'consequence', 'Interruption d''exploitation', 1),
    (v_id, 'consequence', 'Chantage à la publication', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Aéroports / Aviation civile']::text[], 'Perturbation des systèmes d''enregistrement et d''embarquement', 'resilience', 3, 3, 'Dépendance à une plateforme d''enregistrement tierce sans secours local.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Dépendance à un prestataire unique', 0),
    (v_id, 'cause', 'Absence de mode dégradé', 1),
    (v_id, 'cause', 'Interconnexion des systèmes', 2),
    (v_id, 'consequence', 'Files d''attente et vols retardés', 0),
    (v_id, 'consequence', 'Enregistrement manuel dégradé', 1),
    (v_id, 'consequence', 'Impact sur plusieurs aéroports', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Santé publique']::text[], 'Rançongiciel sur le SI hospitalier bloquant la prise en charge', 'resilience', 4, 4, 'Parc informatique hospitalier vieillissant et sous-financé.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Systèmes obsolètes', 0),
    (v_id, 'cause', 'Budget sécurité faible', 1),
    (v_id, 'cause', 'Sauvegardes absentes', 2),
    (v_id, 'consequence', 'Arrêt des soins programmés', 0),
    (v_id, 'consequence', 'Retour au papier', 1),
    (v_id, 'consequence', 'Mise en danger des patients', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Santé publique']::text[], 'Fuite des dossiers médicaux des patients', 'data_protection', 3, 4, 'Dossiers patients accessibles sans cloisonnement par service.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès trop larges', 0),
    (v_id, 'cause', 'Absence de chiffrement', 1),
    (v_id, 'cause', 'Partage non maîtrisé', 2),
    (v_id, 'consequence', 'Divulgation de données de santé', 0),
    (v_id, 'consequence', 'Discrimination et chantage', 1),
    (v_id, 'consequence', 'Sanction de la CDP', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Santé publique']::text[], 'Altération des données épidémiologiques et vaccinales', 'integrity', 2, 4, 'Registres épidémiologiques sans contrôle d''intégrité ni validation.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Saisie non contrôlée', 0),
    (v_id, 'cause', 'Absence de validation', 1),
    (v_id, 'cause', 'Accès non tracé', 2),
    (v_id, 'consequence', 'Décisions sanitaires erronées', 0),
    (v_id, 'consequence', 'Perte de confiance dans les campagnes', 1),
    (v_id, 'consequence', 'Faux certificats vaccinaux', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Santé publique']::text[], 'Compromission des dispositifs médicaux et biomédicaux connectés', 'third_party', 2, 3, 'Dispositifs biomédicaux non corrigeables connectés au réseau de soins.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Micrologiciel non mis à jour', 0),
    (v_id, 'cause', 'Équipements non supervisés', 1),
    (v_id, 'cause', 'Dépendance au fabricant', 2),
    (v_id, 'consequence', 'Dysfonctionnement d''équipement de soin', 0),
    (v_id, 'consequence', 'Rebond vers le SI hospitalier', 1),
    (v_id, 'consequence', 'Risque pour le patient', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Protection sociale']::text[], 'Création de bénéficiaires fictifs par abus d''accès interne', 'integrity', 4, 4, 'Absence de séparation des tâches entre saisie et validation des dossiers.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Séparation des tâches absente', 0),
    (v_id, 'cause', 'Mots de passe partagés', 1),
    (v_id, 'cause', 'Contrôles internes faibles', 2),
    (v_id, 'consequence', 'Détournement de prestations', 0),
    (v_id, 'consequence', 'Pertes financières massives', 1),
    (v_id, 'consequence', 'Fonds détournés des ayants droit', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Protection sociale']::text[], 'Fuite des données des assurés et retraités', 'data_protection', 3, 3, 'Référentiel assurés sans chiffrement ni gestion fine des habilitations.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Base centralisée non chiffrée', 0),
    (v_id, 'cause', 'Accès internes excessifs', 1),
    (v_id, 'cause', 'Partages non sécurisés', 2),
    (v_id, 'consequence', 'Usurpation d''identité', 0),
    (v_id, 'consequence', 'Fraude aux prestations', 1),
    (v_id, 'consequence', 'Sanction réglementaire', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Protection sociale']::text[], 'Détournement des flux de versement des prestations', 'integrity', 3, 4, 'Changement de coordonnées bancaires sans double validation.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Modification de coordonnées bancaires non contrôlée', 0),
    (v_id, 'cause', 'Validation unique', 1),
    (v_id, 'cause', 'Journalisation faible', 2),
    (v_id, 'consequence', 'Versements détournés', 0),
    (v_id, 'consequence', 'Préjudice aux bénéficiaires', 1),
    (v_id, 'consequence', 'Pertes financières', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Éducation / Formation']::text[], 'Altération frauduleuse des résultats d''examens', 'integrity', 3, 3, 'Base de résultats modifiable sans contrôle ni traçabilité renforcée.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Accès à la base de notes mal protégé', 0),
    (v_id, 'cause', 'Complicité interne', 1),
    (v_id, 'cause', 'Contrôle d''intégrité absent', 2),
    (v_id, 'consequence', 'Diplômes indus', 0),
    (v_id, 'consequence', 'Perte de crédibilité des examens', 1),
    (v_id, 'consequence', 'Contentieux et annulations', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Éducation / Formation']::text[], 'Divulgation anticipée des sujets d''examen', 'verifiability', 3, 3, 'Sujets confidentiels accessibles sans chiffrement ni journalisation des accès.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Sujets stockés sans chiffrement', 0),
    (v_id, 'cause', 'Chaîne de confidentialité trop large', 1),
    (v_id, 'cause', 'Traçabilité des accès absente', 2),
    (v_id, 'consequence', 'Annulation d''épreuves', 0),
    (v_id, 'consequence', 'Rupture d''équité', 1),
    (v_id, 'consequence', 'Coûts de réorganisation', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Éducation / Formation']::text[], 'Fuite des données personnelles des étudiants et candidats', 'data_protection', 3, 3, 'Données de candidats accessibles via des points d''inscription non maîtrisés.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Inscriptions via tiers non sécurisés', 0),
    (v_id, 'cause', 'Base candidats exposée', 1),
    (v_id, 'cause', 'Habilitations non maîtrisées', 2),
    (v_id, 'consequence', 'Escroqueries ciblées sur candidats', 0),
    (v_id, 'consequence', 'Usurpation d''identité', 1),
    (v_id, 'consequence', 'Atteinte à la vie privée', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Agriculture / Élevage / Pêche']::text[], 'Compromission des registres de subventions et d''intrants agricoles', 'integrity', 3, 3, 'Registres de bénéficiaires sans vérification ni double contrôle.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Bénéficiaires non vérifiés', 0),
    (v_id, 'cause', 'Saisie non contrôlée', 1),
    (v_id, 'cause', 'Séparation des tâches absente', 2),
    (v_id, 'consequence', 'Détournement d''intrants et de subventions', 0),
    (v_id, 'consequence', 'Exclusion des vrais bénéficiaires', 1),
    (v_id, 'consequence', 'Pertes budgétaires', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Agriculture / Élevage / Pêche']::text[], 'Falsification des données de traçabilité halieutique et sanitaire', 'integrity', 2, 3, 'Documents de traçabilité et certificats sans scellement ni contrôle d''intégrité.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Certificats numériques non protégés', 0),
    (v_id, 'cause', 'Contrôle d''intégrité absent', 1),
    (v_id, 'cause', 'Chaîne de données fragmentée', 2),
    (v_id, 'consequence', 'Faux certificats sanitaires', 0),
    (v_id, 'consequence', 'Blocage à l''exportation', 1),
    (v_id, 'consequence', 'Risque pour la santé des consommateurs', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Environnement']::text[], 'Manipulation des données de surveillance environnementale', 'integrity', 2, 3, 'Capteurs et télémesures sans authentification ni intégrité des données.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Capteurs non authentifiés', 0),
    (v_id, 'cause', 'Transmission non chiffrée', 1),
    (v_id, 'cause', 'Validation des données absente', 2),
    (v_id, 'consequence', 'Décisions environnementales erronées', 0),
    (v_id, 'consequence', 'Pollutions masquées', 1),
    (v_id, 'consequence', 'Perte de confiance dans les mesures', 2);

  insert into public.risk_scenario_templates (sectors, title, dimension, suggested_likelihood, suggested_impact, vulnerability, is_active)
  values (array['Environnement']::text[], 'Indisponibilité des systèmes d''alerte précoce (inondations)', 'resilience', 3, 4, 'Chaîne d''alerte sans redondance ni supervision continue.', true) returning id into v_id;
  insert into public.risk_scenario_template_nodes (template_id, node_type, label, position) values
    (v_id, 'cause', 'Point de défaillance unique', 0),
    (v_id, 'cause', 'Maintenance insuffisante', 1),
    (v_id, 'cause', 'Dépendance à une liaison unique', 2),
    (v_id, 'consequence', 'Alerte non diffusée', 0),
    (v_id, 'consequence', 'Populations non évacuées', 1),
    (v_id, 'consequence', 'Pertes humaines et matérielles', 2);
end $$;
