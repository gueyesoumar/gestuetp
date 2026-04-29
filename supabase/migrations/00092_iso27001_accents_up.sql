-- Migration 00092: Restaure les accents français sur le seed ISO/IEC 27001 — UP
--
-- Le seed initial (supabase/seed/002_iso27001_framework.sql) avait été
-- chargé sans accents (« Controle d'acces » au lieu de « Contrôle d'accès »,
-- « Regles de securite » au lieu de « Règles de sécurité », etc.). La
-- migration met à jour les rows existantes via UPDATE FROM (VALUES …)
-- en filtrant strictement sur framework_id pour ne pas affecter d'autres
-- référentiels qui pourraient utiliser des codes identiques.
--
-- Le seed lui-même est mis à jour en parallèle pour les futurs db reset.

-- ============================================================
-- 1. Framework
-- ============================================================
UPDATE public.frameworks
SET description = 'Système de management de la sécurité de l''information (SMSI). Annexe A — contrôles de référence.'
WHERE id = '00000000-0000-0000-0000-000000000010';

-- ============================================================
-- 2. Domaines (4)
-- ============================================================
UPDATE public.domains AS d
SET name = v.name, description = v.description
FROM (VALUES
  ('A.5', 'Mesures organisationnelles', 'Contrôles liés à la gouvernance et aux politiques de sécurité'),
  ('A.6', 'Mesures liées aux personnes', 'Contrôles liés aux ressources humaines et à la sensibilisation'),
  ('A.7', 'Mesures physiques', 'Contrôles liés à la sécurité physique et environnementale'),
  ('A.8', 'Mesures technologiques', 'Contrôles liés aux technologies et systèmes d''information')
) AS v(code, name, description)
WHERE d.framework_id = '00000000-0000-0000-0000-000000000010'
  AND d.code = v.code;

-- ============================================================
-- 3. Contrôles A.5 — Mesures organisationnelles (37)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('A.5.1', 'Politiques de sécurité de l''information', 'Définir, approuver, publier et communiquer les politiques de sécurité'),
  ('A.5.2', 'Rôles et responsabilités en matière de sécurité de l''information', 'Définir et attribuer les rôles et responsabilités'),
  ('A.5.3', 'Séparation des tâches', 'Séparer les tâches et domaines de responsabilité conflictuels'),
  ('A.5.4', 'Responsabilités de la direction', 'La direction doit exiger l''application de la politique de sécurité'),
  ('A.5.5', 'Contact avec les autorités', 'Établir et maintenir des contacts avec les autorités compétentes'),
  ('A.5.6', 'Contact avec des groupes d''intérêt spécialisés', 'Maintenir des contacts avec des groupes ou forums spécialisés'),
  ('A.5.7', 'Renseignements sur les menaces', 'Collecter et analyser les informations relatives aux menaces'),
  ('A.5.8', 'Sécurité de l''information dans la gestion de projet', 'Intégrer la sécurité dans la gestion de projet'),
  ('A.5.9', 'Inventaire des informations et autres actifs associés', 'Identifier et tenir un inventaire des actifs informationnels'),
  ('A.5.10', 'Utilisation correcte des informations et autres actifs associés', 'Règles d''utilisation acceptable des actifs'),
  ('A.5.11', 'Restitution des actifs', 'Restitution des actifs en fin de contrat ou changement de poste'),
  ('A.5.12', 'Classification des informations', 'Classifier les informations selon leur criticité'),
  ('A.5.13', 'Marquage des informations', 'Mettre en œuvre des procédures de marquage'),
  ('A.5.14', 'Transfert des informations', 'Règles et procédures de transfert sécurisé'),
  ('A.5.15', 'Contrôle d''accès', 'Règles de contrôle d''accès physique et logique'),
  ('A.5.16', 'Gestion des identités', 'Gestion du cycle de vie des identités'),
  ('A.5.17', 'Informations d''authentification', 'Gestion des secrets d''authentification'),
  ('A.5.18', 'Droits d''accès', 'Provision et révocation des droits d''accès'),
  ('A.5.19', 'Sécurité de l''information dans les relations avec les fournisseurs', 'Exigences de sécurité envers les fournisseurs'),
  ('A.5.20', 'Prise en compte de la sécurité dans les accords avec les fournisseurs', 'Clauses de sécurité dans les contrats fournisseurs'),
  ('A.5.21', 'Gestion de la sécurité de l''information dans la chaîne d''approvisionnement TIC', 'Sécurité de la supply chain numérique'),
  ('A.5.22', 'Surveillance, revue et gestion des changements des services fournisseurs', 'Suivi des prestations fournisseurs'),
  ('A.5.23', 'Sécurité de l''information dans l''utilisation de services en nuage', 'Sécurité des services cloud'),
  ('A.5.24', 'Planification et préparation de la gestion des incidents', 'Processus de gestion des incidents de sécurité'),
  ('A.5.25', 'Appréciation et décision concernant les événements de sécurité', 'Évaluation et catégorisation des événements'),
  ('A.5.26', 'Réponse aux incidents de sécurité de l''information', 'Procédures de réponse aux incidents'),
  ('A.5.27', 'Tirer des enseignements des incidents', 'Retour d''expérience post-incident'),
  ('A.5.28', 'Collecte de preuves', 'Collecte et préservation des preuves numériques'),
  ('A.5.29', 'Sécurité de l''information en cas de perturbation', 'Continuité de la sécurité en situation de crise'),
  ('A.5.30', 'Préparation des TIC pour la continuité d''activité', 'Plans de continuité IT'),
  ('A.5.31', 'Exigences légales, statutaires, réglementaires et contractuelles', 'Identification des exigences légales applicables'),
  ('A.5.32', 'Droits de propriété intellectuelle', 'Protection de la propriété intellectuelle'),
  ('A.5.33', 'Protection des enregistrements', 'Protection des enregistrements réglementaires'),
  ('A.5.34', 'Vie privée et protection des DCP', 'Protection des données à caractère personnel'),
  ('A.5.35', 'Revue indépendante de la sécurité de l''information', 'Audits indépendants de la sécurité'),
  ('A.5.36', 'Conformité aux politiques, règles et normes de sécurité', 'Vérification de la conformité interne'),
  ('A.5.37', 'Procédures d''exploitation documentées', 'Documentation des procédures opérationnelles')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0001-000000000001';

-- ============================================================
-- 4. Contrôles A.6 — Mesures liées aux personnes (8)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('A.6.1', 'Sélection des candidats', 'Vérification des antécédents avant embauche'),
  ('A.6.2', 'Termes et conditions d''emploi', 'Clauses de sécurité dans les contrats de travail'),
  ('A.6.3', 'Sensibilisation, éducation et formation', 'Programme de sensibilisation à la sécurité'),
  ('A.6.4', 'Processus disciplinaire', 'Sanctions en cas de violation de la politique de sécurité'),
  ('A.6.5', 'Responsabilités après la fin ou le changement d''emploi', 'Obligations post-emploi'),
  ('A.6.6', 'Accords de confidentialité ou de non-divulgation', 'NDA et clauses de confidentialité'),
  ('A.6.7', 'Travail à distance', 'Sécurité du télétravail'),
  ('A.6.8', 'Signalement des événements de sécurité', 'Mécanismes de signalement des incidents')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0001-000000000002';

-- ============================================================
-- 5. Contrôles A.7 — Mesures physiques (14)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('A.7.1', 'Périmètres de sécurité physique', 'Définition des zones sécurisées'),
  ('A.7.2', 'Contrôles physiques des accès', 'Contrôle d''accès aux locaux'),
  ('A.7.3', 'Sécurisation des bureaux, des salles et des équipements', 'Protection physique des espaces de travail'),
  ('A.7.4', 'Surveillance de la sécurité physique', 'Surveillance vidéo et monitoring'),
  ('A.7.5', 'Protection contre les menaces physiques et environnementales', 'Incendie, inondation, catastrophes naturelles'),
  ('A.7.6', 'Travail dans les zones sécurisées', 'Règles de travail en zone sécurisée'),
  ('A.7.7', 'Bureau propre et écran vide', 'Politique clean desk / clear screen'),
  ('A.7.8', 'Emplacement et protection du matériel', 'Positionnement sécurisé des équipements'),
  ('A.7.9', 'Sécurité des actifs hors des locaux', 'Protection des équipements mobiles'),
  ('A.7.10', 'Supports de stockage', 'Gestion sécurisée des supports amovibles'),
  ('A.7.11', 'Services généraux', 'Protection des alimentations électriques et télécoms'),
  ('A.7.12', 'Sécurité du câblage', 'Protection des câbles réseau et électriques'),
  ('A.7.13', 'Maintenance du matériel', 'Maintenance préventive et corrective'),
  ('A.7.14', 'Mise au rebut ou réutilisation sécurisée du matériel', 'Effacement sécurisé avant mise au rebut')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0001-000000000003';

-- ============================================================
-- 6. Contrôles A.8 — Mesures technologiques (34)
-- ============================================================
UPDATE public.controls AS c
SET name = v.name, description = v.description
FROM (VALUES
  ('A.8.1', 'Terminaux utilisateurs', 'Protection des postes de travail et mobiles'),
  ('A.8.2', 'Droits d''accès privilégiés', 'Gestion des comptes à privilèges'),
  ('A.8.3', 'Restriction d''accès aux informations', 'Contrôle d''accès basé sur le besoin d''en connaître'),
  ('A.8.4', 'Accès au code source', 'Protection de l''accès au code source'),
  ('A.8.5', 'Authentification sécurisée', 'Mécanismes d''authentification robustes'),
  ('A.8.6', 'Dimensionnement', 'Gestion de la capacité des ressources'),
  ('A.8.7', 'Protection contre les programmes malveillants', 'Antivirus et anti-malware'),
  ('A.8.8', 'Gestion des vulnérabilités techniques', 'Veille et correction des vulnérabilités'),
  ('A.8.9', 'Gestion de la configuration', 'Sécurisation des configurations système'),
  ('A.8.10', 'Suppression d''information', 'Effacement sécurisé des données'),
  ('A.8.11', 'Masquage des données', 'Anonymisation et pseudonymisation'),
  ('A.8.12', 'Prévention de la fuite de données', 'Outils et politiques DLP'),
  ('A.8.13', 'Sauvegarde des informations', 'Politique de sauvegarde et restauration'),
  ('A.8.14', 'Redondance des moyens de traitement de l''information', 'Haute disponibilité et résilience'),
  ('A.8.15', 'Journalisation', 'Logs d''activité et piste d''audit'),
  ('A.8.16', 'Activités de surveillance', 'Monitoring et détection d''anomalies'),
  ('A.8.17', 'Synchronisation des horloges', 'Synchronisation NTP des systèmes'),
  ('A.8.18', 'Utilisation de programmes utilitaires privilégiés', 'Contrôle des outils système'),
  ('A.8.19', 'Installation de logiciels sur les systèmes opérationnels', 'Contrôle de l''installation logicielle'),
  ('A.8.20', 'Sécurité des réseaux', 'Segmentation et protection réseau'),
  ('A.8.21', 'Sécurité des services réseau', 'SLA et sécurité des services réseau'),
  ('A.8.22', 'Cloisonnement des réseaux', 'Segmentation réseau (VLAN, DMZ)'),
  ('A.8.23', 'Filtrage web', 'Filtrage des accès internet'),
  ('A.8.24', 'Utilisation de la cryptographie', 'Chiffrement des données en transit et au repos'),
  ('A.8.25', 'Cycle de vie de développement sécurisé', 'Sécurité dans le SDLC'),
  ('A.8.26', 'Exigences de sécurité des applications', 'Spécifications de sécurité applicative'),
  ('A.8.27', 'Principes d''ingénierie et d''architecture sécurisées', 'Security by design'),
  ('A.8.28', 'Codage sécurisé', 'Pratiques de développement sécurisé'),
  ('A.8.29', 'Tests de sécurité dans le développement et l''acceptation', 'Tests de pénétration et revues de code'),
  ('A.8.30', 'Développement externalisé', 'Sécurité du développement sous-traité'),
  ('A.8.31', 'Séparation des environnements de développement, de test et opérationnels', 'Isolation dev/test/prod'),
  ('A.8.32', 'Gestion des changements', 'Processus de gestion des changements'),
  ('A.8.33', 'Informations de test', 'Protection des données de test'),
  ('A.8.34', 'Protection des systèmes d''information durant les tests d''audit', 'Sécurité pendant les audits techniques')
) AS v(code, name, description)
WHERE c.code = v.code
  AND c.domain_id = '00000000-0000-0000-0001-000000000004';
