-- Migration: audit_topics_seed (UP)
-- Description: Insère le catalogue de sujets d'audit + les questions-clé par
-- sujet directement via migration (les fichiers du dossier seed/ ne sont pas
-- joués automatiquement par `supabase db push`).
--
-- Idempotent : cleanup préventif en tête, puis insertion. Couvre ISO 27001 v2
-- (10 sujets) et PSSI-ES (11 sujets), avec mapping topic→contrôles et
-- questions-clé par sujet.

-- Cleanup préventif (idempotent)
delete from public.topic_controls where topic_id in (
  select id from public.audit_topics where framework_id in (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000017'
  )
);
delete from public.audit_topics where framework_id in (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000017'
);

-- ============================================================
-- ISO 27001 v2 — 10 sujets transverses
-- ============================================================

insert into public.audit_topics (id, framework_id, name, description, sort_order) values
('20000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
 'Gouvernance & politiques',
 'Politiques de sécurité, rôles et responsabilités, exigences légales et réglementaires, revue indépendante, conformité.', 1),
('20000010-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010',
 'Gestion des accès et identités',
 'Contrôle d''accès, gestion des identités, authentification, droits, MFA, comptes à privilèges.', 2),
('20000010-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010',
 'Gestion des fournisseurs',
 'Sécurité dans les relations fournisseurs, supply chain, services cloud, audits prestataires.', 3),
('20000010-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010',
 'Gestion des incidents & journalisation',
 'Détection, signalement, gestion et apprentissage des incidents. Logs, surveillance, collecte de preuves.', 4),
('20000010-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010',
 'Continuité d''activité',
 'PCA / PRA, redondance des traitements, sauvegardes, préparation TIC à la continuité.', 5),
('20000010-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010',
 'Sensibilisation & RH',
 'Filtrage, conditions d''emploi, sensibilisation, formation, gestion des départs, télétravail, données personnelles.', 6),
('20000010-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010',
 'Sécurité physique',
 'Périmètres, contrôle d''accès physique, sécurisation des locaux, équipements, supports, mise au rebut.', 7),
('20000010-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010',
 'Gestion des actifs & données',
 'Inventaire, utilisation, classification, marquage, transfert, masquage, prévention de fuite de données.', 8),
('20000010-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010',
 'Sécurité technique & réseau',
 'Endpoints, malwares, vulnérabilités, configuration, réseaux, cloisonnement, cryptographie, filtrage Web.', 9),
('20000010-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000010',
 'Développement & gestion des changements',
 'Cycle de développement sécurisé, tests, séparation des environnements, gestion des changements, externalisation.', 10);

-- Mapping topic → contrôles ISO 27001 v2
-- Helper : on insère via une jointure sur le code pour ne pas dépendre des UUIDs des contrôles.
insert into public.topic_controls (topic_id, control_id)
select t.topic_id, c.id from (values
  -- 1. Gouvernance & politiques
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.1'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.2'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.3'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.4'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.31'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.32'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.33'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.35'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.36'),
  ('20000010-0000-0000-0000-000000000001'::uuid, 'A.5.37'),
  -- 2. Gestion des accès et identités
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.5.15'),
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.5.16'),
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.5.17'),
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.5.18'),
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.8.2'),
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.8.3'),
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.8.5'),
  ('20000010-0000-0000-0000-000000000002'::uuid, 'A.8.18'),
  -- 3. Gestion des fournisseurs
  ('20000010-0000-0000-0000-000000000003'::uuid, 'A.5.19'),
  ('20000010-0000-0000-0000-000000000003'::uuid, 'A.5.20'),
  ('20000010-0000-0000-0000-000000000003'::uuid, 'A.5.21'),
  ('20000010-0000-0000-0000-000000000003'::uuid, 'A.5.22'),
  ('20000010-0000-0000-0000-000000000003'::uuid, 'A.5.23'),
  -- 4. Gestion des incidents & journalisation
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.5.24'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.5.25'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.5.26'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.5.27'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.5.28'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.6.8'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.8.15'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.8.16'),
  ('20000010-0000-0000-0000-000000000004'::uuid, 'A.8.17'),
  -- 5. Continuité d'activité
  ('20000010-0000-0000-0000-000000000005'::uuid, 'A.5.29'),
  ('20000010-0000-0000-0000-000000000005'::uuid, 'A.5.30'),
  ('20000010-0000-0000-0000-000000000005'::uuid, 'A.8.13'),
  ('20000010-0000-0000-0000-000000000005'::uuid, 'A.8.14'),
  -- 6. Sensibilisation & RH
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.5.34'),
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.6.1'),
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.6.2'),
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.6.3'),
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.6.4'),
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.6.5'),
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.6.6'),
  ('20000010-0000-0000-0000-000000000006'::uuid, 'A.6.7'),
  -- 7. Sécurité physique
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.1'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.2'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.3'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.4'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.5'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.6'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.7'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.8'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.9'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.11'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.12'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.13'),
  ('20000010-0000-0000-0000-000000000007'::uuid, 'A.7.14'),
  -- 8. Gestion des actifs & données
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.5.9'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.5.10'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.5.11'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.5.12'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.5.13'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.5.14'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.7.10'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.8.4'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.8.10'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.8.11'),
  ('20000010-0000-0000-0000-000000000008'::uuid, 'A.8.12'),
  -- 9. Sécurité technique & réseau
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.5.5'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.5.6'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.5.7'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.1'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.6'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.7'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.8'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.9'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.19'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.20'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.21'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.22'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.23'),
  ('20000010-0000-0000-0000-000000000009'::uuid, 'A.8.24'),
  -- 10. Développement & gestion des changements
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.5.8'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.25'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.26'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.27'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.28'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.29'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.30'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.31'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.32'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.33'),
  ('20000010-0000-0000-0000-00000000000a'::uuid, 'A.8.34')
) as t(topic_id, control_code)
join public.controls c on c.code = t.control_code
join public.domains d on d.id = c.domain_id
where d.framework_id = '00000000-0000-0000-0000-000000000010';

-- ============================================================
-- PSSI-ES — 11 sujets (alignés sur les chapitres I-XI)
-- ============================================================

insert into public.audit_topics (id, framework_id, name, description, sort_order) values
('20000017-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000017',
 'Gouvernance & organisation SSI',
 'Comité de sécurité, AQSSI, RSSI, ASSI, structuration des responsabilités SI au sein de l''entité.', 1),
('20000017-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000017',
 'Sensibilisation & RH',
 'Recrutement, sensibilisation, formation, sanctions, gestion des départs et mouvements.', 2),
('20000017-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000017',
 'Acquisition & développement sécurisé',
 'Exigences sécurité dans les acquisitions, développements internes et externalisés, tests pré-prod.', 3),
('20000017-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000017',
 'Gestion des actifs',
 'Inventaire, classification (TRÈS SECRET / SECRET / CONFIDENTIEL), supports amovibles, mise au rebut.', 4),
('20000017-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000017',
 'Gestion des fournisseurs',
 'Politique fournisseurs, charte de sécurité, sous-traitants, audits prestations, supply chain.', 5),
('20000017-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000017',
 'Sécurité physique',
 'Périmètres, zones sécurisées, contrôles d''accès, registre d''entrée, agents de sécurité, services généraux.', 6),
('20000017-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000017',
 'Sécurité logique & accès',
 'Authentification, mots de passe, chiffrement, gestion des privilèges et habilitations.', 7),
('20000017-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000017',
 'Exploitation & sauvegardes',
 'Procédures opérationnelles, antivirus, sauvegardes et tests de restauration, journalisation.', 8),
('20000017-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000017',
 'Cloud, mobile & télétravail',
 'Services cloud externalisés, équipements mobiles, BYOD, télétravail.', 9),
('20000017-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000017',
 'Gestion des incidents',
 'Détection, signalement, traitement et capitalisation des incidents de sécurité SI.', 10),
('20000017-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000017',
 'Audit & conformité',
 'Audits internes et externes, indicateurs de conformité PSSI-ES, plans d''action correctifs.', 11);

-- Mapping topic → contrôles PSSI : 1 sujet = 1 chapitre = 1 domaine.
-- On peut faire le mapping par domaine plutôt que par code individuel.
insert into public.topic_controls (topic_id, control_id)
select tm.topic_id, c.id from (values
  ('20000017-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0008-000000000001'::uuid),  -- ORG
  ('20000017-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0008-000000000002'::uuid),  -- PER
  ('20000017-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0008-000000000003'::uuid),  -- ACQ
  ('20000017-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0008-000000000004'::uuid),  -- ACT
  ('20000017-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0008-000000000005'::uuid),  -- FRN
  ('20000017-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0008-000000000006'::uuid),  -- PHY
  ('20000017-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0008-000000000007'::uuid),  -- LOG
  ('20000017-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0008-000000000008'::uuid),  -- EXP
  ('20000017-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0008-000000000009'::uuid),  -- CLM
  ('20000017-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0008-000000000010'::uuid),  -- INC
  ('20000017-0000-0000-0000-00000000000b'::uuid, '00000000-0000-0000-0008-000000000011'::uuid)   -- AUD
) as tm(topic_id, domain_id)
join public.controls c on c.domain_id = tm.domain_id;
-- Seed: Questions-clé par sujet d'audit
-- Phase D de la refonte des Entretiens.
--
-- Chaque sujet du catalogue reçoit 3-5 questions ouvertes que l'auditeur
-- pose en entretien. Servent de canevas pour le PV pré-rempli (interview_schedules.pv_template).

-- ============================================================
-- ISO 27001 v2 — 10 sujets
-- ============================================================

update public.audit_topics set default_questions = '[
  "Comment la politique de sécurité de l''information est-elle formalisée et approuvée ?",
  "À quelle fréquence est-elle revue et qui valide les évolutions ?",
  "Comment les rôles et responsabilités SSI sont-ils définis ?",
  "Comment l''entité s''assure-t-elle de la conformité légale et réglementaire applicable ?",
  "Existe-t-il une revue indépendante du SMSI ? À quelle fréquence ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000001';

update public.audit_topics set default_questions = '[
  "Comment les accès aux systèmes sont-ils provisionnés et révoqués ?",
  "Le MFA est-il imposé sur les accès distants et les comptes à privilèges ?",
  "Comment sont gérés les comptes administrateurs et techniques ?",
  "Existe-t-il une revue périodique des droits d''accès ? À quelle fréquence ?",
  "Comment les comptes sont-ils désactivés en cas de départ ou mutation ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000002';

update public.audit_topics set default_questions = '[
  "Comment les exigences de sécurité sont-elles intégrées dans les contrats fournisseurs ?",
  "Comment auditez-vous la conformité de vos prestataires aux exigences SSI ?",
  "Comment gérez-vous les accès des fournisseurs à vos systèmes ?",
  "Avez-vous une cartographie de votre supply chain numérique ?",
  "Comment sont gérés les services cloud (clauses, monitoring, plan de réversibilité) ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000003';

update public.audit_topics set default_questions = '[
  "Quelle est la procédure de gestion des incidents de sécurité ?",
  "Qui détecte les incidents et comment sont-ils remontés ?",
  "Quelle est votre politique de journalisation et conservation des logs ?",
  "Avez-vous un SOC interne ou externalisé ? Quelle couverture horaire ?",
  "Avez-vous réalisé des exercices de réponse à incident dans les 12 derniers mois ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000004';

update public.audit_topics set default_questions = '[
  "Disposez-vous d''un PCA et/ou PRA formalisé ?",
  "Quels sont vos RTO et RPO par activité critique ?",
  "Quelle est la fréquence des tests de continuité ?",
  "Comment sont gérées les sauvegardes (politique, fréquence, tests de restauration) ?",
  "Avez-vous une stratégie de redondance pour les SI critiques ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000005';

update public.audit_topics set default_questions = '[
  "Existe-t-il un programme de sensibilisation SSI ? Cible-t-il tous les profils ?",
  "À quelle fréquence les collaborateurs sont-ils formés/sensibilisés ?",
  "Comment sont gérées les habilitations à l''embauche, mutation, départ ?",
  "Comment est encadré le télétravail ?",
  "Comment sont protégées les données à caractère personnel ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000006';

update public.audit_topics set default_questions = '[
  "Comment est sécurisé l''accès physique aux locaux sensibles (DC, salle serveurs) ?",
  "Existe-t-il un registre d''accès et un dispositif de surveillance ?",
  "Comment sont protégés les équipements contre les menaces environnementales ?",
  "Quelle est la procédure de mise au rebut des équipements et supports ?",
  "Comment est appliquée la politique bureau propre / écran verrouillé ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000007';

update public.audit_topics set default_questions = '[
  "Disposez-vous d''un inventaire à jour des actifs informationnels ?",
  "Existe-t-il une classification des informations ? Sur quels niveaux ?",
  "Comment sont gérés les transferts d''information sensibles ?",
  "Avez-vous une solution DLP en place ?",
  "Comment sont protégés les supports amovibles ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000008';

update public.audit_topics set default_questions = '[
  "Comment est segmenté votre réseau ? Existe-t-il une DMZ ?",
  "Quelle solution antivirus/EDR est déployée et comment est-elle pilotée ?",
  "Quelle est votre politique de gestion des vulnérabilités (scans, patching) ?",
  "Comment sont chiffrées les données au repos et en transit ?",
  "Comment est géré le filtrage Web et les flux sortants ?"
]'::jsonb where id = '20000010-0000-0000-0000-000000000009';

update public.audit_topics set default_questions = '[
  "Quel est votre cycle de développement sécurisé (SSDLC) ?",
  "Quelles sont vos pratiques de revue de code et de tests de sécurité ?",
  "Comment sont séparés les environnements de dev, recette et production ?",
  "Quel est votre processus de gestion des changements en production ?",
  "Comment sont encadrés les développements externalisés ?"
]'::jsonb where id = '20000010-0000-0000-0000-00000000000a';

-- ============================================================
-- PSSI-ES — 11 sujets
-- ============================================================

update public.audit_topics set default_questions = '[
  "Comment est composé le Comité de sécurité (AQSSI) et à quelle fréquence se réunit-il ?",
  "Le RSSI dispose-t-il d''une lettre de mission formelle ?",
  "Comment sont nommés et formés les ASSI sur les sites ?",
  "Existe-t-il une note d''organisation SSI signée par l''autorité de l''entité ?",
  "Comment le RSSI suit-il la mise en place de la PSSI-ES ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000001';

update public.audit_topics set default_questions = '[
  "Les agents signent-ils une charte de confidentialité à l''embauche ?",
  "Comment se déroulent les enquêtes de sécurité préalables aux habilitations ?",
  "Quelle est la fréquence des actions de sensibilisation SSI ?",
  "Comment sont gérés les départs et changements de poste (révocation des accès) ?",
  "Les agents sont-ils informés des sanctions en cas de violation ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000002';

update public.audit_topics set default_questions = '[
  "Les exigences de sécurité sont-elles formalisées dans les cahiers des charges ?",
  "Comment se déroulent les tests de sécurité avant mise en production ?",
  "Quelles normes ou standards de développement sécurisé appliquez-vous ?",
  "Comment encadrez-vous les développements externalisés ?",
  "Les locaux de développement sont-ils sécurisés ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000003';

update public.audit_topics set default_questions = '[
  "Disposez-vous d''un inventaire des actifs SI à jour ?",
  "Chaque actif est-il affecté à un responsable identifié ?",
  "Comment classifiez-vous les informations (TRÈS SECRET / SECRET / CONFIDENTIEL) ?",
  "Comment sont protégés les supports amovibles ?",
  "Quelle est la procédure de mise au rebut sécurisé des matériels ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000004';

update public.audit_topics set default_questions = '[
  "Comment sont contractualisées les exigences SSI avec les fournisseurs ?",
  "Existe-t-il une charte de sécurité signée par les prestataires ?",
  "Comment vérifiez-vous la conformité de vos fournisseurs ?",
  "Quels audits réalisez-vous sur les prestations externalisées ?",
  "Comment sont pris en compte les sous-traitants ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000005';

update public.audit_topics set default_questions = '[
  "Comment sont identifiées les zones sécurisées (DC, salles serveurs) ?",
  "Quel est le dispositif de contrôle d''accès physique (badges, registre, agent) ?",
  "Comment sont gérées les autorisations d''accès aux zones sensibles ?",
  "Comment sont protégés les locaux contre les menaces environnementales ?",
  "Une politique de bureau propre est-elle en place ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000006';

update public.audit_topics set default_questions = '[
  "Comment sont attribués et révoqués les droits d''accès logiques ?",
  "Existe-t-il une politique de mots de passe formalisée ?",
  "Le MFA est-il en place sur les accès sensibles ?",
  "Quels mécanismes de chiffrement sont utilisés (en transit, au repos) ?",
  "Comment sont gérés les comptes à privilèges ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000007';

update public.audit_topics set default_questions = '[
  "Existe-t-il des procédures d''exploitation documentées ?",
  "Quelle est votre politique de sauvegarde (fréquence, rétention, tests) ?",
  "Quelle solution antivirus/anti-malware est déployée ?",
  "Comment est gérée la journalisation et la conservation des logs ?",
  "Comment sont gérés les changements en production ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000008';

update public.audit_topics set default_questions = '[
  "Quels services cloud utilisez-vous et pour quels usages ?",
  "Comment sont contractualisées les clauses de sécurité avec les fournisseurs cloud ?",
  "Existe-t-il une politique d''utilisation des appareils mobiles ?",
  "Comment est encadré le télétravail (équipement, accès, formation) ?",
  "Comment sont gérées les données stockées dans le cloud ?"
]'::jsonb where id = '20000017-0000-0000-0000-000000000009';

update public.audit_topics set default_questions = '[
  "Existe-t-il une procédure formalisée de gestion des incidents de sécurité ?",
  "Comment les agents signalent-ils un incident ?",
  "Quel est le délai moyen de détection et traitement ?",
  "Combien d''incidents majeurs avez-vous traités dans les 12 derniers mois ?",
  "Existe-t-il un retour d''expérience capitalisé après chaque incident ?"
]'::jsonb where id = '20000017-0000-0000-0000-00000000000a';

update public.audit_topics set default_questions = '[
  "À quelle fréquence sont réalisés des audits internes de conformité PSSI-ES ?",
  "Quels indicateurs SSI suivez-vous au comité de direction ?",
  "Comment est piloté le plan d''actions correctives suite aux audits ?",
  "Avez-vous déjà fait l''objet d''un audit externe (ARTP, ADIE, STCC-SSI) ?",
  "Comment êtes-vous informé des évolutions réglementaires SSI ?"
]'::jsonb where id = '20000017-0000-0000-0000-00000000000b';
