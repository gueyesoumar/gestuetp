-- Seed: Template questionnaire de prise de connaissance PSSI-ES
-- Referentiel: PSSI-ES — Senegal (Instruction presidentielle N°003/PR du 03 janvier 2017)
-- Framework ID: 00000000-0000-0000-0000-000000000017
-- 30 questions couvrant les 11 domaines + contexte general

insert into public.questionnaire_templates (id, framework_id, name, description, version)
values (
  '00000000-0000-0000-0000-000000000025',
  '00000000-0000-0000-0000-000000000017',
  'Questionnaire de prise de connaissance — PSSI-ES',
  'Questionnaire initial envoye a l''entite en debut de mission PSSI-ES. Couvre les 11 domaines de l''instruction presidentielle.',
  '1.0'
);

insert into public.questions (template_id, code, text, description, question_type, options, is_required, sort_order) values

-- ═══════════════════════════════════════════
-- CONTEXTE GENERAL
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'CTX-01',
 'Quelle est la mission principale de votre entite ?',
 'Decrivez brievement le mandat, les missions et le perimetre d''intervention de votre entite.',
 'textarea', null, true, 1),

('00000000-0000-0000-0000-000000000025', 'CTX-02',
 'Quel est l''effectif de votre entite ?',
 null,
 'single_choice', '["Moins de 50", "50 a 200", "200 a 500", "500 a 1000", "Plus de 1000"]', true, 2),

('00000000-0000-0000-0000-000000000025', 'CTX-03',
 'Combien de sites geographiques sont concernes ?',
 'Nombre de batiments ou locaux distincts hebergeant du personnel ou des equipements SI.',
 'text', null, true, 3),

('00000000-0000-0000-0000-000000000025', 'CTX-04',
 'Votre entite a-t-elle deja fait l''objet d''un audit de conformite PSSI-ES ?',
 null,
 'boolean', null, true, 4),

('00000000-0000-0000-0000-000000000025', 'CTX-05',
 'Si oui, quel etait le score obtenu et quand ?',
 null,
 'text', null, false, 5),

-- ═══════════════════════════════════════════
-- ORG — Organisation de la securite des SI
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'ORG-01',
 'Existe-t-il un Responsable de la Securite des Systemes d''Information (RSSI) nomme ?',
 'Regle 1 de la PSSI-ES : chaque entite doit designer un RSSI.',
 'boolean', null, true, 6),

('00000000-0000-0000-0000-000000000025', 'ORG-02',
 'Comment est organisee la gouvernance de la securite SI dans votre entite ?',
 'Decrivez les niveaux de gouvernance (decision, pilotage, operations) et les comites existants.',
 'textarea', null, true, 7),

('00000000-0000-0000-0000-000000000025', 'ORG-03',
 'Disposez-vous d''une politique de securite des systemes d''information (PSSI) interne formalisee ?',
 null,
 'boolean', null, true, 8),

-- ═══════════════════════════════════════════
-- PER — Securite du personnel
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'PER-01',
 'Des clauses de confidentialite sont-elles integrees dans les contrats de travail ?',
 null,
 'boolean', null, true, 9),

('00000000-0000-0000-0000-000000000025', 'PER-02',
 'Des sessions de sensibilisation a la securite SI sont-elles organisees regulierement ?',
 null,
 'single_choice', '["Jamais", "Ponctuellement", "Annuellement", "Semestriellement ou plus"]', true, 10),

('00000000-0000-0000-0000-000000000025', 'PER-03',
 'Existe-t-il une procedure pour le depart ou le changement de poste des agents ?',
 'Restitution des acces, equipements, badges, etc.',
 'boolean', null, true, 11),

-- ═══════════════════════════════════════════
-- ACQ — Acquisition et developpement des SI
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'ACQ-01',
 'Les exigences de securite sont-elles prises en compte dans les cahiers des charges d''acquisition de SI ?',
 null,
 'single_choice', '["Jamais", "Parfois", "Systematiquement"]', true, 12),

('00000000-0000-0000-0000-000000000025', 'ACQ-02',
 'Des tests de securite sont-ils realises avant la mise en production des applications ?',
 null,
 'boolean', null, true, 13),

-- ═══════════════════════════════════════════
-- ACT — Gestion des actifs
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'ACT-01',
 'Disposez-vous d''un inventaire des actifs informationnels (materiel, logiciel, donnees) ?',
 null,
 'boolean', null, true, 14),

('00000000-0000-0000-0000-000000000025', 'ACT-02',
 'Les actifs sont-ils classifies selon leur niveau de sensibilite ?',
 'Niveaux : diffusion restreinte, confidentiel, secret, etc.',
 'single_choice', '["Pas de classification", "Classification partielle", "Classification formalisee et appliquee"]', true, 15),

-- ═══════════════════════════════════════════
-- FRN — Relation avec les fournisseurs
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'FRN-01',
 'Les contrats avec les prestataires et fournisseurs incluent-ils des clauses de securite SI ?',
 null,
 'single_choice', '["Jamais", "Parfois", "Systematiquement"]', true, 16),

('00000000-0000-0000-0000-000000000025', 'FRN-02',
 'Des audits de securite sont-ils realises sur les prestataires ayant acces a vos SI ?',
 null,
 'boolean', null, true, 17),

-- ═══════════════════════════════════════════
-- PHY — Securite physique
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'PHY-01',
 'Les locaux hebergeant des equipements sensibles (salle serveur, baies reseau) sont-ils securises ?',
 'Controle d''acces physique, surveillance, climatisation, etc.',
 'single_choice', '["Non securise", "Partiellement securise", "Entierement securise avec controle d''acces"]', true, 18),

('00000000-0000-0000-0000-000000000025', 'PHY-02',
 'Une politique de bureau propre et ecran verrouille est-elle en place ?',
 null,
 'boolean', null, true, 19),

-- ═══════════════════════════════════════════
-- LOG — Securite logique
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'LOG-01',
 'Comment est geree l''attribution des droits d''acces aux systemes d''information ?',
 null,
 'single_choice', '["Pas de processus formel", "Processus informel", "Processus formalise avec validation hierarchique"]', true, 20),

('00000000-0000-0000-0000-000000000025', 'LOG-02',
 'Une politique de mots de passe est-elle definie et appliquee ?',
 'Complexite, renouvellement, interdiction de partage, etc.',
 'boolean', null, true, 21),

('00000000-0000-0000-0000-000000000025', 'LOG-03',
 'Des mecanismes de chiffrement sont-ils utilises pour les donnees sensibles ?',
 'Chiffrement au repos, en transit, messagerie, supports amovibles.',
 'single_choice', '["Aucun chiffrement", "Chiffrement partiel (transit uniquement)", "Chiffrement complet (transit + repos)"]', true, 22),

-- ═══════════════════════════════════════════
-- EXP — Securite de l''exploitation
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'EXP-01',
 'Des procedures d''exploitation documentees existent-elles pour les operations SI courantes ?',
 null,
 'boolean', null, true, 23),

('00000000-0000-0000-0000-000000000025', 'EXP-02',
 'Des sauvegardes regulieres sont-elles realisees et testees ?',
 null,
 'single_choice', '["Pas de sauvegarde", "Sauvegardes sans test de restauration", "Sauvegardes avec tests periodiques"]', true, 24),

('00000000-0000-0000-0000-000000000025', 'EXP-03',
 'Un antivirus/antimalware est-il deploye et mis a jour sur l''ensemble du parc ?',
 null,
 'boolean', null, true, 25),

-- ═══════════════════════════════════════════
-- CLM — Cloud, appareils mobiles et teletravail
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'CLM-01',
 'Votre entite utilise-t-elle des services cloud ? Si oui, lesquels ?',
 'Messagerie, stockage, applications metier, etc.',
 'textarea', null, true, 26),

('00000000-0000-0000-0000-000000000025', 'CLM-02',
 'Existe-t-il une politique encadrant l''utilisation des appareils mobiles et le teletravail ?',
 null,
 'boolean', null, true, 27),

-- ═══════════════════════════════════════════
-- INC — Gestion des incidents
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'INC-01',
 'Disposez-vous d''une procedure de gestion des incidents de securite SI ?',
 null,
 'boolean', null, true, 28),

('00000000-0000-0000-0000-000000000025', 'INC-02',
 'Combien d''incidents de securite majeurs avez-vous subi au cours des 12 derniers mois ?',
 null,
 'single_choice', '["Aucun", "1 a 3", "4 a 10", "Plus de 10"]', true, 29),

-- ═══════════════════════════════════════════
-- AUD — Audit et conformite
-- ═══════════════════════════════════════════
('00000000-0000-0000-0000-000000000025', 'AUD-01',
 'Quels sont vos principaux enjeux et attentes vis-a-vis de cette mission de conformite PSSI-ES ?',
 null,
 'textarea', null, true, 30);
