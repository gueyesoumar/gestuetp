-- Seed: Catalogue de sujets d'audit
-- Phase A de la refonte des Entretiens.
--
-- Ce seed crée le catalogue par référentiel : meta-thèmes qui regroupent N
-- contrôles transverses (ex: "Gestion des accès" couvre A.5.15-18, A.8.2,
-- A.8.3, A.8.5). Les UUIDs sont déterministes pour permettre un re-seed
-- idempotent.
--
-- Couverture : ISO 27001 v2 (10 sujets) + PSSI-ES (11 sujets).

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
