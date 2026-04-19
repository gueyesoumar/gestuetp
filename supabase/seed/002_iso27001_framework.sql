-- Seed: Referentiel ISO/IEC 27001:2022 — Annexe A
-- Domaines et controles principaux

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000010',
  'ISO/IEC 27001',
  'iso-27001',
  'Systeme de management de la securite de l''information (SMSI). Annexe A — controles de reference.',
  '2022',
  'ISO/IEC'
);

-- ============================================================
-- Domaines (Annexe A — ISO 27001:2022, 4 themes)
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010', 'A.5', 'Mesures organisationnelles', 'Controles lies a la gouvernance et aux politiques de securite', 1),
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000010', 'A.6', 'Mesures liees aux personnes', 'Controles lies aux ressources humaines et a la sensibilisation', 2),
('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000010', 'A.7', 'Mesures physiques', 'Controles lies a la securite physique et environnementale', 3),
('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000010', 'A.8', 'Mesures technologiques', 'Controles lies aux technologies et systemes d''information', 4);

-- ============================================================
-- Controles — A.5 Mesures organisationnelles (37 controles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000001', 'A.5.1', 'Politiques de securite de l''information', 'Definir, approuver, publier et communiquer les politiques de securite', 1),
('00000000-0000-0000-0001-000000000001', 'A.5.2', 'Roles et responsabilites en matiere de securite de l''information', 'Definir et attribuer les roles et responsabilites', 2),
('00000000-0000-0000-0001-000000000001', 'A.5.3', 'Separation des taches', 'Separer les taches et domaines de responsabilite conflictuels', 3),
('00000000-0000-0000-0001-000000000001', 'A.5.4', 'Responsabilites de la direction', 'La direction doit exiger l''application de la politique de securite', 4),
('00000000-0000-0000-0001-000000000001', 'A.5.5', 'Contact avec les autorites', 'Etablir et maintenir des contacts avec les autorites competentes', 5),
('00000000-0000-0000-0001-000000000001', 'A.5.6', 'Contact avec des groupes d''interet specialises', 'Maintenir des contacts avec des groupes ou forums specialises', 6),
('00000000-0000-0000-0001-000000000001', 'A.5.7', 'Renseignements sur les menaces', 'Collecter et analyser les informations relatives aux menaces', 7),
('00000000-0000-0000-0001-000000000001', 'A.5.8', 'Securite de l''information dans la gestion de projet', 'Integrer la securite dans la gestion de projet', 8),
('00000000-0000-0000-0001-000000000001', 'A.5.9', 'Inventaire des informations et autres actifs associes', 'Identifier et tenir un inventaire des actifs informationnels', 9),
('00000000-0000-0000-0001-000000000001', 'A.5.10', 'Utilisation correcte des informations et autres actifs associes', 'Regles d''utilisation acceptable des actifs', 10),
('00000000-0000-0000-0001-000000000001', 'A.5.11', 'Restitution des actifs', 'Restitution des actifs en fin de contrat ou changement de poste', 11),
('00000000-0000-0000-0001-000000000001', 'A.5.12', 'Classification des informations', 'Classifier les informations selon leur criticite', 12),
('00000000-0000-0000-0001-000000000001', 'A.5.13', 'Marquage des informations', 'Mettre en oeuvre des procedures de marquage', 13),
('00000000-0000-0000-0001-000000000001', 'A.5.14', 'Transfert des informations', 'Regles et procedures de transfert securise', 14),
('00000000-0000-0000-0001-000000000001', 'A.5.15', 'Controle d''acces', 'Regles de controle d''acces physique et logique', 15),
('00000000-0000-0000-0001-000000000001', 'A.5.16', 'Gestion des identites', 'Gestion du cycle de vie des identites', 16),
('00000000-0000-0000-0001-000000000001', 'A.5.17', 'Informations d''authentification', 'Gestion des secrets d''authentification', 17),
('00000000-0000-0000-0001-000000000001', 'A.5.18', 'Droits d''acces', 'Provision et revocation des droits d''acces', 18),
('00000000-0000-0000-0001-000000000001', 'A.5.19', 'Securite de l''information dans les relations avec les fournisseurs', 'Exigences de securite envers les fournisseurs', 19),
('00000000-0000-0000-0001-000000000001', 'A.5.20', 'Prise en compte de la securite dans les accords avec les fournisseurs', 'Clauses de securite dans les contrats fournisseurs', 20),
('00000000-0000-0000-0001-000000000001', 'A.5.21', 'Gestion de la securite de l''information dans la chaine d''approvisionnement TIC', 'Securite de la supply chain numerique', 21),
('00000000-0000-0000-0001-000000000001', 'A.5.22', 'Surveillance, revue et gestion des changements des services fournisseurs', 'Suivi des prestations fournisseurs', 22),
('00000000-0000-0000-0001-000000000001', 'A.5.23', 'Securite de l''information dans l''utilisation de services en nuage', 'Securite des services cloud', 23),
('00000000-0000-0000-0001-000000000001', 'A.5.24', 'Planification et preparation de la gestion des incidents', 'Processus de gestion des incidents de securite', 24),
('00000000-0000-0000-0001-000000000001', 'A.5.25', 'Appreciation et decision concernant les evenements de securite', 'Evaluation et categorisation des evenements', 25),
('00000000-0000-0000-0001-000000000001', 'A.5.26', 'Reponse aux incidents de securite de l''information', 'Procedures de reponse aux incidents', 26),
('00000000-0000-0000-0001-000000000001', 'A.5.27', 'Tirer des enseignements des incidents', 'Retour d''experience post-incident', 27),
('00000000-0000-0000-0001-000000000001', 'A.5.28', 'Collecte de preuves', 'Collecte et preservation des preuves numeriques', 28),
('00000000-0000-0000-0001-000000000001', 'A.5.29', 'Securite de l''information en cas de perturbation', 'Continuite de la securite en situation de crise', 29),
('00000000-0000-0000-0001-000000000001', 'A.5.30', 'Preparation des TIC pour la continuite d''activite', 'Plans de continuite IT', 30),
('00000000-0000-0000-0001-000000000001', 'A.5.31', 'Exigences legales, statutaires, reglementaires et contractuelles', 'Identification des exigences legales applicables', 31),
('00000000-0000-0000-0001-000000000001', 'A.5.32', 'Droits de propriete intellectuelle', 'Protection de la propriete intellectuelle', 32),
('00000000-0000-0000-0001-000000000001', 'A.5.33', 'Protection des enregistrements', 'Protection des enregistrements reglementaires', 33),
('00000000-0000-0000-0001-000000000001', 'A.5.34', 'Vie privee et protection des DCP', 'Protection des donnees a caractere personnel', 34),
('00000000-0000-0000-0001-000000000001', 'A.5.35', 'Revue independante de la securite de l''information', 'Audits independants de la securite', 35),
('00000000-0000-0000-0001-000000000001', 'A.5.36', 'Conformite aux politiques, regles et normes de securite', 'Verification de la conformite interne', 36),
('00000000-0000-0000-0001-000000000001', 'A.5.37', 'Procedures d''exploitation documentees', 'Documentation des procedures operationnelles', 37);

-- ============================================================
-- Controles — A.6 Mesures liees aux personnes (8 controles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000002', 'A.6.1', 'Selection des candidats', 'Verification des antecedents avant embauche', 1),
('00000000-0000-0000-0001-000000000002', 'A.6.2', 'Termes et conditions d''emploi', 'Clauses de securite dans les contrats de travail', 2),
('00000000-0000-0000-0001-000000000002', 'A.6.3', 'Sensibilisation, education et formation', 'Programme de sensibilisation a la securite', 3),
('00000000-0000-0000-0001-000000000002', 'A.6.4', 'Processus disciplinaire', 'Sanctions en cas de violation de la politique de securite', 4),
('00000000-0000-0000-0001-000000000002', 'A.6.5', 'Responsabilites apres la fin ou le changement d''emploi', 'Obligations post-emploi', 5),
('00000000-0000-0000-0001-000000000002', 'A.6.6', 'Accords de confidentialite ou de non-divulgation', 'NDA et clauses de confidentialite', 6),
('00000000-0000-0000-0001-000000000002', 'A.6.7', 'Travail a distance', 'Securite du teletravail', 7),
('00000000-0000-0000-0001-000000000002', 'A.6.8', 'Signalement des evenements de securite', 'Mecanismes de signalement des incidents', 8);

-- ============================================================
-- Controles — A.7 Mesures physiques (14 controles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000003', 'A.7.1', 'Perimetres de securite physique', 'Definition des zones securisees', 1),
('00000000-0000-0000-0001-000000000003', 'A.7.2', 'Controles physiques des acces', 'Controle d''acces aux locaux', 2),
('00000000-0000-0000-0001-000000000003', 'A.7.3', 'Securisation des bureaux, des salles et des equipements', 'Protection physique des espaces de travail', 3),
('00000000-0000-0000-0001-000000000003', 'A.7.4', 'Surveillance de la securite physique', 'Surveillance video et monitoring', 4),
('00000000-0000-0000-0001-000000000003', 'A.7.5', 'Protection contre les menaces physiques et environnementales', 'Incendie, inondation, catastrophes naturelles', 5),
('00000000-0000-0000-0001-000000000003', 'A.7.6', 'Travail dans les zones securisees', 'Regles de travail en zone securisee', 6),
('00000000-0000-0000-0001-000000000003', 'A.7.7', 'Bureau propre et ecran vide', 'Politique clean desk / clear screen', 7),
('00000000-0000-0000-0001-000000000003', 'A.7.8', 'Emplacement et protection du materiel', 'Positionnement securise des equipements', 8),
('00000000-0000-0000-0001-000000000003', 'A.7.9', 'Securite des actifs hors des locaux', 'Protection des equipements mobiles', 9),
('00000000-0000-0000-0001-000000000003', 'A.7.10', 'Supports de stockage', 'Gestion securisee des supports amovibles', 10),
('00000000-0000-0000-0001-000000000003', 'A.7.11', 'Services generaux', 'Protection des alimentations electriques et telecoms', 11),
('00000000-0000-0000-0001-000000000003', 'A.7.12', 'Securite du cablage', 'Protection des cables reseau et electriques', 12),
('00000000-0000-0000-0001-000000000003', 'A.7.13', 'Maintenance du materiel', 'Maintenance preventive et corrective', 13),
('00000000-0000-0000-0001-000000000003', 'A.7.14', 'Mise au rebut ou reutilisation securisee du materiel', 'Effacement securise avant mise au rebut', 14);

-- ============================================================
-- Controles — A.8 Mesures technologiques (34 controles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000004', 'A.8.1', 'Terminaux utilisateurs', 'Protection des postes de travail et mobiles', 1),
('00000000-0000-0000-0001-000000000004', 'A.8.2', 'Droits d''acces privilegies', 'Gestion des comptes a privileges', 2),
('00000000-0000-0000-0001-000000000004', 'A.8.3', 'Restriction d''acces aux informations', 'Controle d''acces base sur le besoin d''en connaitre', 3),
('00000000-0000-0000-0001-000000000004', 'A.8.4', 'Acces au code source', 'Protection de l''acces au code source', 4),
('00000000-0000-0000-0001-000000000004', 'A.8.5', 'Authentification securisee', 'Mecanismes d''authentification robustes', 5),
('00000000-0000-0000-0001-000000000004', 'A.8.6', 'Dimensionnement', 'Gestion de la capacite des ressources', 6),
('00000000-0000-0000-0001-000000000004', 'A.8.7', 'Protection contre les programmes malveillants', 'Antivirus et anti-malware', 7),
('00000000-0000-0000-0001-000000000004', 'A.8.8', 'Gestion des vulnerabilites techniques', 'Veille et correction des vulnerabilites', 8),
('00000000-0000-0000-0001-000000000004', 'A.8.9', 'Gestion de la configuration', 'Securisation des configurations systeme', 9),
('00000000-0000-0000-0001-000000000004', 'A.8.10', 'Suppression d''information', 'Effacement securise des donnees', 10),
('00000000-0000-0000-0001-000000000004', 'A.8.11', 'Masquage des donnees', 'Anonymisation et pseudonymisation', 11),
('00000000-0000-0000-0001-000000000004', 'A.8.12', 'Prevention de la fuite de donnees', 'Outils et politiques DLP', 12),
('00000000-0000-0000-0001-000000000004', 'A.8.13', 'Sauvegarde des informations', 'Politique de sauvegarde et restauration', 13),
('00000000-0000-0000-0001-000000000004', 'A.8.14', 'Redondance des moyens de traitement de l''information', 'Haute disponibilite et resilience', 14),
('00000000-0000-0000-0001-000000000004', 'A.8.15', 'Journalisation', 'Logs d''activite et piste d''audit', 15),
('00000000-0000-0000-0001-000000000004', 'A.8.16', 'Activites de surveillance', 'Monitoring et detection d''anomalies', 16),
('00000000-0000-0000-0001-000000000004', 'A.8.17', 'Synchronisation des horloges', 'Synchronisation NTP des systemes', 17),
('00000000-0000-0000-0001-000000000004', 'A.8.18', 'Utilisation de programmes utilitaires privilegies', 'Controle des outils systeme', 18),
('00000000-0000-0000-0001-000000000004', 'A.8.19', 'Installation de logiciels sur les systemes operationnels', 'Controle de l''installation logicielle', 19),
('00000000-0000-0000-0001-000000000004', 'A.8.20', 'Securite des reseaux', 'Segmentation et protection reseau', 20),
('00000000-0000-0000-0001-000000000004', 'A.8.21', 'Securite des services reseau', 'SLA et securite des services reseau', 21),
('00000000-0000-0000-0001-000000000004', 'A.8.22', 'Cloisonnement des reseaux', 'Segmentation reseau (VLAN, DMZ)', 22),
('00000000-0000-0000-0001-000000000004', 'A.8.23', 'Filtrage web', 'Filtrage des acces internet', 23),
('00000000-0000-0000-0001-000000000004', 'A.8.24', 'Utilisation de la cryptographie', 'Chiffrement des donnees en transit et au repos', 24),
('00000000-0000-0000-0001-000000000004', 'A.8.25', 'Cycle de vie de developpement securise', 'Securite dans le SDLC', 25),
('00000000-0000-0000-0001-000000000004', 'A.8.26', 'Exigences de securite des applications', 'Specifications de securite applicative', 26),
('00000000-0000-0000-0001-000000000004', 'A.8.27', 'Principes d''ingenierie et d''architecture securisees', 'Security by design', 27),
('00000000-0000-0000-0001-000000000004', 'A.8.28', 'Codage securise', 'Pratiques de developpement securise', 28),
('00000000-0000-0000-0001-000000000004', 'A.8.29', 'Tests de securite dans le developpement et l''acceptation', 'Tests de penetration et revues de code', 29),
('00000000-0000-0000-0001-000000000004', 'A.8.30', 'Developpement externalise', 'Securite du developpement sous-traite', 30),
('00000000-0000-0000-0001-000000000004', 'A.8.31', 'Separation des environnements de developpement, de test et operationnels', 'Isolation dev/test/prod', 31),
('00000000-0000-0000-0001-000000000004', 'A.8.32', 'Gestion des changements', 'Processus de gestion des changements', 32),
('00000000-0000-0000-0001-000000000004', 'A.8.33', 'Informations de test', 'Protection des donnees de test', 33),
('00000000-0000-0000-0001-000000000004', 'A.8.34', 'Protection des systemes d''information durant les tests d''audit', 'Securite pendant les audits techniques', 34);
