-- Seed: Référentiel ISO/IEC 27001:2022 — Annexe A
-- Domaines et contrôles principaux

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000010',
  'ISO/IEC 27001',
  'iso-27001',
  'Système de management de la sécurité de l''information (SMSI). Annexe A — contrôles de référence.',
  '2022',
  'ISO/IEC'
);

-- ============================================================
-- Domaines (Annexe A — ISO 27001:2022, 4 thèmes)
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010', 'A.5', 'Mesures organisationnelles', 'Contrôles liés à la gouvernance et aux politiques de sécurité', 1),
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000010', 'A.6', 'Mesures liées aux personnes', 'Contrôles liés aux ressources humaines et à la sensibilisation', 2),
('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000010', 'A.7', 'Mesures physiques', 'Contrôles liés à la sécurité physique et environnementale', 3),
('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000010', 'A.8', 'Mesures technologiques', 'Contrôles liés aux technologies et systèmes d''information', 4);

-- ============================================================
-- Contrôles — A.5 Mesures organisationnelles (37 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000001', 'A.5.1', 'Politiques de sécurité de l''information', 'Définir, approuver, publier et communiquer les politiques de sécurité', 1),
('00000000-0000-0000-0001-000000000001', 'A.5.2', 'Rôles et responsabilités en matière de sécurité de l''information', 'Définir et attribuer les rôles et responsabilités', 2),
('00000000-0000-0000-0001-000000000001', 'A.5.3', 'Séparation des tâches', 'Séparer les tâches et domaines de responsabilité conflictuels', 3),
('00000000-0000-0000-0001-000000000001', 'A.5.4', 'Responsabilités de la direction', 'La direction doit exiger l''application de la politique de sécurité', 4),
('00000000-0000-0000-0001-000000000001', 'A.5.5', 'Contact avec les autorités', 'Établir et maintenir des contacts avec les autorités compétentes', 5),
('00000000-0000-0000-0001-000000000001', 'A.5.6', 'Contact avec des groupes d''intérêt spécialisés', 'Maintenir des contacts avec des groupes ou forums spécialisés', 6),
('00000000-0000-0000-0001-000000000001', 'A.5.7', 'Renseignements sur les menaces', 'Collecter et analyser les informations relatives aux menaces', 7),
('00000000-0000-0000-0001-000000000001', 'A.5.8', 'Sécurité de l''information dans la gestion de projet', 'Intégrer la sécurité dans la gestion de projet', 8),
('00000000-0000-0000-0001-000000000001', 'A.5.9', 'Inventaire des informations et autres actifs associés', 'Identifier et tenir un inventaire des actifs informationnels', 9),
('00000000-0000-0000-0001-000000000001', 'A.5.10', 'Utilisation correcte des informations et autres actifs associés', 'Règles d''utilisation acceptable des actifs', 10),
('00000000-0000-0000-0001-000000000001', 'A.5.11', 'Restitution des actifs', 'Restitution des actifs en fin de contrat ou changement de poste', 11),
('00000000-0000-0000-0001-000000000001', 'A.5.12', 'Classification des informations', 'Classifier les informations selon leur criticité', 12),
('00000000-0000-0000-0001-000000000001', 'A.5.13', 'Marquage des informations', 'Mettre en œuvre des procédures de marquage', 13),
('00000000-0000-0000-0001-000000000001', 'A.5.14', 'Transfert des informations', 'Règles et procédures de transfert sécurisé', 14),
('00000000-0000-0000-0001-000000000001', 'A.5.15', 'Contrôle d''accès', 'Règles de contrôle d''accès physique et logique', 15),
('00000000-0000-0000-0001-000000000001', 'A.5.16', 'Gestion des identités', 'Gestion du cycle de vie des identités', 16),
('00000000-0000-0000-0001-000000000001', 'A.5.17', 'Informations d''authentification', 'Gestion des secrets d''authentification', 17),
('00000000-0000-0000-0001-000000000001', 'A.5.18', 'Droits d''accès', 'Provision et révocation des droits d''accès', 18),
('00000000-0000-0000-0001-000000000001', 'A.5.19', 'Sécurité de l''information dans les relations avec les fournisseurs', 'Exigences de sécurité envers les fournisseurs', 19),
('00000000-0000-0000-0001-000000000001', 'A.5.20', 'Prise en compte de la sécurité dans les accords avec les fournisseurs', 'Clauses de sécurité dans les contrats fournisseurs', 20),
('00000000-0000-0000-0001-000000000001', 'A.5.21', 'Gestion de la sécurité de l''information dans la chaîne d''approvisionnement TIC', 'Sécurité de la supply chain numérique', 21),
('00000000-0000-0000-0001-000000000001', 'A.5.22', 'Surveillance, revue et gestion des changements des services fournisseurs', 'Suivi des prestations fournisseurs', 22),
('00000000-0000-0000-0001-000000000001', 'A.5.23', 'Sécurité de l''information dans l''utilisation de services en nuage', 'Sécurité des services cloud', 23),
('00000000-0000-0000-0001-000000000001', 'A.5.24', 'Planification et préparation de la gestion des incidents', 'Processus de gestion des incidents de sécurité', 24),
('00000000-0000-0000-0001-000000000001', 'A.5.25', 'Appréciation et décision concernant les événements de sécurité', 'Évaluation et catégorisation des événements', 25),
('00000000-0000-0000-0001-000000000001', 'A.5.26', 'Réponse aux incidents de sécurité de l''information', 'Procédures de réponse aux incidents', 26),
('00000000-0000-0000-0001-000000000001', 'A.5.27', 'Tirer des enseignements des incidents', 'Retour d''expérience post-incident', 27),
('00000000-0000-0000-0001-000000000001', 'A.5.28', 'Collecte de preuves', 'Collecte et préservation des preuves numériques', 28),
('00000000-0000-0000-0001-000000000001', 'A.5.29', 'Sécurité de l''information en cas de perturbation', 'Continuité de la sécurité en situation de crise', 29),
('00000000-0000-0000-0001-000000000001', 'A.5.30', 'Préparation des TIC pour la continuité d''activité', 'Plans de continuité IT', 30),
('00000000-0000-0000-0001-000000000001', 'A.5.31', 'Exigences légales, statutaires, réglementaires et contractuelles', 'Identification des exigences légales applicables', 31),
('00000000-0000-0000-0001-000000000001', 'A.5.32', 'Droits de propriété intellectuelle', 'Protection de la propriété intellectuelle', 32),
('00000000-0000-0000-0001-000000000001', 'A.5.33', 'Protection des enregistrements', 'Protection des enregistrements réglementaires', 33),
('00000000-0000-0000-0001-000000000001', 'A.5.34', 'Vie privée et protection des DCP', 'Protection des données à caractère personnel', 34),
('00000000-0000-0000-0001-000000000001', 'A.5.35', 'Revue indépendante de la sécurité de l''information', 'Audits indépendants de la sécurité', 35),
('00000000-0000-0000-0001-000000000001', 'A.5.36', 'Conformité aux politiques, règles et normes de sécurité', 'Vérification de la conformité interne', 36),
('00000000-0000-0000-0001-000000000001', 'A.5.37', 'Procédures d''exploitation documentées', 'Documentation des procédures opérationnelles', 37);

-- ============================================================
-- Contrôles — A.6 Mesures liées aux personnes (8 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000002', 'A.6.1', 'Sélection des candidats', 'Vérification des antécédents avant embauche', 1),
('00000000-0000-0000-0001-000000000002', 'A.6.2', 'Termes et conditions d''emploi', 'Clauses de sécurité dans les contrats de travail', 2),
('00000000-0000-0000-0001-000000000002', 'A.6.3', 'Sensibilisation, éducation et formation', 'Programme de sensibilisation à la sécurité', 3),
('00000000-0000-0000-0001-000000000002', 'A.6.4', 'Processus disciplinaire', 'Sanctions en cas de violation de la politique de sécurité', 4),
('00000000-0000-0000-0001-000000000002', 'A.6.5', 'Responsabilités après la fin ou le changement d''emploi', 'Obligations post-emploi', 5),
('00000000-0000-0000-0001-000000000002', 'A.6.6', 'Accords de confidentialité ou de non-divulgation', 'NDA et clauses de confidentialité', 6),
('00000000-0000-0000-0001-000000000002', 'A.6.7', 'Travail à distance', 'Sécurité du télétravail', 7),
('00000000-0000-0000-0001-000000000002', 'A.6.8', 'Signalement des événements de sécurité', 'Mécanismes de signalement des incidents', 8);

-- ============================================================
-- Contrôles — A.7 Mesures physiques (14 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000003', 'A.7.1', 'Périmètres de sécurité physique', 'Définition des zones sécurisées', 1),
('00000000-0000-0000-0001-000000000003', 'A.7.2', 'Contrôles physiques des accès', 'Contrôle d''accès aux locaux', 2),
('00000000-0000-0000-0001-000000000003', 'A.7.3', 'Sécurisation des bureaux, des salles et des équipements', 'Protection physique des espaces de travail', 3),
('00000000-0000-0000-0001-000000000003', 'A.7.4', 'Surveillance de la sécurité physique', 'Surveillance vidéo et monitoring', 4),
('00000000-0000-0000-0001-000000000003', 'A.7.5', 'Protection contre les menaces physiques et environnementales', 'Incendie, inondation, catastrophes naturelles', 5),
('00000000-0000-0000-0001-000000000003', 'A.7.6', 'Travail dans les zones sécurisées', 'Règles de travail en zone sécurisée', 6),
('00000000-0000-0000-0001-000000000003', 'A.7.7', 'Bureau propre et écran vide', 'Politique clean desk / clear screen', 7),
('00000000-0000-0000-0001-000000000003', 'A.7.8', 'Emplacement et protection du matériel', 'Positionnement sécurisé des équipements', 8),
('00000000-0000-0000-0001-000000000003', 'A.7.9', 'Sécurité des actifs hors des locaux', 'Protection des équipements mobiles', 9),
('00000000-0000-0000-0001-000000000003', 'A.7.10', 'Supports de stockage', 'Gestion sécurisée des supports amovibles', 10),
('00000000-0000-0000-0001-000000000003', 'A.7.11', 'Services généraux', 'Protection des alimentations électriques et télécoms', 11),
('00000000-0000-0000-0001-000000000003', 'A.7.12', 'Sécurité du câblage', 'Protection des câbles réseau et électriques', 12),
('00000000-0000-0000-0001-000000000003', 'A.7.13', 'Maintenance du matériel', 'Maintenance préventive et corrective', 13),
('00000000-0000-0000-0001-000000000003', 'A.7.14', 'Mise au rebut ou réutilisation sécurisée du matériel', 'Effacement sécurisé avant mise au rebut', 14);

-- ============================================================
-- Contrôles — A.8 Mesures technologiques (34 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0001-000000000004', 'A.8.1', 'Terminaux utilisateurs', 'Protection des postes de travail et mobiles', 1),
('00000000-0000-0000-0001-000000000004', 'A.8.2', 'Droits d''accès privilégiés', 'Gestion des comptes à privilèges', 2),
('00000000-0000-0000-0001-000000000004', 'A.8.3', 'Restriction d''accès aux informations', 'Contrôle d''accès basé sur le besoin d''en connaître', 3),
('00000000-0000-0000-0001-000000000004', 'A.8.4', 'Accès au code source', 'Protection de l''accès au code source', 4),
('00000000-0000-0000-0001-000000000004', 'A.8.5', 'Authentification sécurisée', 'Mécanismes d''authentification robustes', 5),
('00000000-0000-0000-0001-000000000004', 'A.8.6', 'Dimensionnement', 'Gestion de la capacité des ressources', 6),
('00000000-0000-0000-0001-000000000004', 'A.8.7', 'Protection contre les programmes malveillants', 'Antivirus et anti-malware', 7),
('00000000-0000-0000-0001-000000000004', 'A.8.8', 'Gestion des vulnérabilités techniques', 'Veille et correction des vulnérabilités', 8),
('00000000-0000-0000-0001-000000000004', 'A.8.9', 'Gestion de la configuration', 'Sécurisation des configurations système', 9),
('00000000-0000-0000-0001-000000000004', 'A.8.10', 'Suppression d''information', 'Effacement sécurisé des données', 10),
('00000000-0000-0000-0001-000000000004', 'A.8.11', 'Masquage des données', 'Anonymisation et pseudonymisation', 11),
('00000000-0000-0000-0001-000000000004', 'A.8.12', 'Prévention de la fuite de données', 'Outils et politiques DLP', 12),
('00000000-0000-0000-0001-000000000004', 'A.8.13', 'Sauvegarde des informations', 'Politique de sauvegarde et restauration', 13),
('00000000-0000-0000-0001-000000000004', 'A.8.14', 'Redondance des moyens de traitement de l''information', 'Haute disponibilité et résilience', 14),
('00000000-0000-0000-0001-000000000004', 'A.8.15', 'Journalisation', 'Logs d''activité et piste d''audit', 15),
('00000000-0000-0000-0001-000000000004', 'A.8.16', 'Activités de surveillance', 'Monitoring et détection d''anomalies', 16),
('00000000-0000-0000-0001-000000000004', 'A.8.17', 'Synchronisation des horloges', 'Synchronisation NTP des systèmes', 17),
('00000000-0000-0000-0001-000000000004', 'A.8.18', 'Utilisation de programmes utilitaires privilégiés', 'Contrôle des outils système', 18),
('00000000-0000-0000-0001-000000000004', 'A.8.19', 'Installation de logiciels sur les systèmes opérationnels', 'Contrôle de l''installation logicielle', 19),
('00000000-0000-0000-0001-000000000004', 'A.8.20', 'Sécurité des réseaux', 'Segmentation et protection réseau', 20),
('00000000-0000-0000-0001-000000000004', 'A.8.21', 'Sécurité des services réseau', 'SLA et sécurité des services réseau', 21),
('00000000-0000-0000-0001-000000000004', 'A.8.22', 'Cloisonnement des réseaux', 'Segmentation réseau (VLAN, DMZ)', 22),
('00000000-0000-0000-0001-000000000004', 'A.8.23', 'Filtrage web', 'Filtrage des accès internet', 23),
('00000000-0000-0000-0001-000000000004', 'A.8.24', 'Utilisation de la cryptographie', 'Chiffrement des données en transit et au repos', 24),
('00000000-0000-0000-0001-000000000004', 'A.8.25', 'Cycle de vie de développement sécurisé', 'Sécurité dans le SDLC', 25),
('00000000-0000-0000-0001-000000000004', 'A.8.26', 'Exigences de sécurité des applications', 'Spécifications de sécurité applicative', 26),
('00000000-0000-0000-0001-000000000004', 'A.8.27', 'Principes d''ingénierie et d''architecture sécurisées', 'Security by design', 27),
('00000000-0000-0000-0001-000000000004', 'A.8.28', 'Codage sécurisé', 'Pratiques de développement sécurisé', 28),
('00000000-0000-0000-0001-000000000004', 'A.8.29', 'Tests de sécurité dans le développement et l''acceptation', 'Tests de pénétration et revues de code', 29),
('00000000-0000-0000-0001-000000000004', 'A.8.30', 'Développement externalisé', 'Sécurité du développement sous-traité', 30),
('00000000-0000-0000-0001-000000000004', 'A.8.31', 'Séparation des environnements de développement, de test et opérationnels', 'Isolation dev/test/prod', 31),
('00000000-0000-0000-0001-000000000004', 'A.8.32', 'Gestion des changements', 'Processus de gestion des changements', 32),
('00000000-0000-0000-0001-000000000004', 'A.8.33', 'Informations de test', 'Protection des données de test', 33),
('00000000-0000-0000-0001-000000000004', 'A.8.34', 'Protection des systèmes d''information durant les tests d''audit', 'Sécurité pendant les audits techniques', 34);
