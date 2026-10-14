-- Seed: Template questionnaire de prise de connaissance PSSI-ES
-- Référentiel: PSSI-ES - Sénégal (Instruction présidentielle N°003/PR du 03 janvier 2017)
-- Framework ID: 00000000-0000-0000-0000-000000000017
-- 30 questions couvrant les 11 domaines + contexte général

insert into public.questionnaire_templates (id, framework_id, name, description, version)
values (
  '00000000-0000-0000-0000-000000000025',
  '00000000-0000-0000-0000-000000000017',
  'Questionnaire de prise de connaissance - PSSI-ES',
  'Questionnaire initial envoyé à l''entité en début de mission PSSI-ES. Couvre les 11 domaines de l''instruction présidentielle.',
  '1.0'
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.questions (template_id, code, text, description, question_type, options, is_required, sort_order) values

-- -------------------------------------------
-- CONTEXTE GÉNÉRAL
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'CTX-01',
 'Quelle est la mission principale de votre entité ?',
 'Décrivez brièvement le mandat, les missions et le périmètre d''intervention de votre entité.',
 'textarea', null, true, 1),

('00000000-0000-0000-0000-000000000025', 'CTX-02',
 'Quel est l''effectif de votre entité ?',
 null,
 'single_choice', '["Moins de 50","50 à 250","250 à 1 000","1 000 à 5 000","Plus de 5 000"]', true, 2),

('00000000-0000-0000-0000-000000000025', 'CTX-03',
 'Combien de sites géographiques sont concernés ?',
 'Nombre de bâtiments ou locaux distincts hébergeant du personnel ou des équipements SI.',
 'text', null, true, 3),

('00000000-0000-0000-0000-000000000025', 'CTX-04',
 'Votre entité a-t-elle déjà fait l''objet d''un audit de conformité PSSI-ES ?',
 null,
 'boolean', null, true, 4),

('00000000-0000-0000-0000-000000000025', 'CTX-05',
 'Si oui, quel était le score obtenu et quand ?',
 null,
 'text', null, false, 5),

-- -------------------------------------------
-- ORG - Organisation de la sécurité des SI
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'ORG-01',
 'Existe-t-il un Responsable de la Sécurité des Systèmes d''Information (RSSI) nommé ?',
 'Règle 1 de la PSSI-ES : chaque entité doit désigner un RSSI.',
 'boolean', null, true, 6),

('00000000-0000-0000-0000-000000000025', 'ORG-02',
 'Comment est organisée la gouvernance de la sécurité SI dans votre entité ?',
 'Décrivez les niveaux de gouvernance (décision, pilotage, opérations) et les comités existants.',
 'textarea', null, true, 7),

('00000000-0000-0000-0000-000000000025', 'ORG-03',
 'Disposez-vous d''une politique de sécurité des systèmes d''information (PSSI) interne formalisée ?',
 null,
 'boolean', null, true, 8),

-- -------------------------------------------
-- PER - Sécurité du personnel
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'PER-01',
 'Des clauses de confidentialité sont-elles intégrées dans les contrats de travail ?',
 null,
 'boolean', null, true, 9),

('00000000-0000-0000-0000-000000000025', 'PER-02',
 'Des sessions de sensibilisation à la sécurité SI sont-elles organisées régulièrement ?',
 null,
 'single_choice', '["Jamais", "Ponctuellement", "Annuellement", "Semestriellement ou plus"]', true, 10),

('00000000-0000-0000-0000-000000000025', 'PER-03',
 'Existe-t-il une procédure pour le départ ou le changement de poste des agents ?',
 'Restitution des accès, équipements, badges, etc.',
 'boolean', null, true, 11),

-- -------------------------------------------
-- ACQ - Acquisition et développement des SI
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'ACQ-01',
 'Les exigences de sécurité sont-elles prises en compte dans les cahiers des charges d''acquisition de SI ?',
 null,
 'single_choice', '["Jamais", "Parfois", "Systématiquement"]', true, 12),

('00000000-0000-0000-0000-000000000025', 'ACQ-02',
 'Des tests de sécurité sont-ils réalisés avant la mise en production des applications ?',
 null,
 'boolean', null, true, 13),

-- -------------------------------------------
-- ACT - Gestion des actifs
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'ACT-01',
 'Disposez-vous d''un inventaire des actifs informationnels (matériel, logiciel, données) ?',
 null,
 'boolean', null, true, 14),

('00000000-0000-0000-0000-000000000025', 'ACT-02',
 'Les actifs sont-ils classifiés selon leur niveau de sensibilité ?',
 'Niveaux : diffusion restreinte, confidentiel, secret, etc.',
 'single_choice', '["Pas de classification", "Classification partielle", "Classification formalisée et appliquée"]', true, 15),

-- -------------------------------------------
-- FRN - Relation avec les fournisseurs
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'FRN-01',
 'Les contrats avec les prestataires et fournisseurs incluent-ils des clauses de sécurité SI ?',
 null,
 'single_choice', '["Jamais", "Parfois", "Systématiquement"]', true, 16),

('00000000-0000-0000-0000-000000000025', 'FRN-02',
 'Des audits de sécurité sont-ils réalisés sur les prestataires ayant accès à vos SI ?',
 null,
 'boolean', null, true, 17),

-- -------------------------------------------
-- PHY - Sécurité physique
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'PHY-01',
 'Les locaux hébergeant des équipements sensibles (salle serveur, baies réseau) sont-ils sécurisés ?',
 'Contrôle d''accès physique, surveillance, climatisation, etc.',
 'single_choice', '["Non sécurisé", "Partiellement sécurisé", "Entièrement sécurisé avec contrôle d''accès"]', true, 18),

('00000000-0000-0000-0000-000000000025', 'PHY-02',
 'Une politique de bureau propre et écran verrouillé est-elle en place ?',
 null,
 'boolean', null, true, 19),

-- -------------------------------------------
-- LOG - Sécurité logique
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'LOG-01',
 'Comment est gérée l''attribution des droits d''accès aux systèmes d''information ?',
 null,
 'single_choice', '["Pas de processus formel", "Processus informel", "Processus formalisé avec validation hiérarchique"]', true, 20),

('00000000-0000-0000-0000-000000000025', 'LOG-02',
 'Une politique de mots de passe est-elle définie et appliquée ?',
 'Complexité, renouvellement, interdiction de partage, etc.',
 'boolean', null, true, 21),

('00000000-0000-0000-0000-000000000025', 'LOG-03',
 'Des mécanismes de chiffrement sont-ils utilisés pour les données sensibles ?',
 'Chiffrement au repos, en transit, messagerie, supports amovibles.',
 'single_choice', '["Aucun chiffrement", "Chiffrement partiel (transit uniquement)", "Chiffrement complet (transit + repos)"]', true, 22),

-- -------------------------------------------
-- EXP - Sécurité de l''exploitation
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'EXP-01',
 'Des procédures d''exploitation documentées existent-elles pour les opérations SI courantes ?',
 null,
 'boolean', null, true, 23),

('00000000-0000-0000-0000-000000000025', 'EXP-02',
 'Des sauvegardes régulières sont-elles réalisées et testées ?',
 null,
 'single_choice', '["Pas de sauvegarde", "Sauvegardes sans test de restauration", "Sauvegardes avec tests périodiques"]', true, 24),

('00000000-0000-0000-0000-000000000025', 'EXP-03',
 'Un antivirus/antimalware est-il déployé et mis à jour sur l''ensemble du parc ?',
 null,
 'boolean', null, true, 25),

-- -------------------------------------------
-- CLM - Cloud, appareils mobiles et télétravail
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'CLM-01',
 'Votre entité utilise-t-elle des services cloud ? Si oui, lesquels ?',
 'Messagerie, stockage, applications métier, etc.',
 'textarea', null, true, 26),

('00000000-0000-0000-0000-000000000025', 'CLM-02',
 'Existe-t-il une politique encadrant l''utilisation des appareils mobiles et le télétravail ?',
 null,
 'boolean', null, true, 27),

-- -------------------------------------------
-- INC - Gestion des incidents
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'INC-01',
 'Disposez-vous d''une procédure de gestion des incidents de sécurité SI ?',
 null,
 'boolean', null, true, 28),

('00000000-0000-0000-0000-000000000025', 'INC-02',
 'Combien d''incidents de sécurité majeurs avez-vous subi au cours des 12 derniers mois ?',
 null,
 'single_choice', '["Aucun", "1 à 3", "4 à 10", "Plus de 10"]', true, 29),

-- -------------------------------------------
-- AUD - Audit et conformité
-- -------------------------------------------
('00000000-0000-0000-0000-000000000025', 'AUD-01',
 'Quels sont vos principaux enjeux et attentes vis-à-vis de cette mission de conformité PSSI-ES ?',
 null,
 'textarea', null, true, 30)
on conflict (template_id, code) do update set
  text = excluded.text,
  description = excluded.description,
  options = excluded.options,
  question_type = excluded.question_type,
  is_required = excluded.is_required,
  sort_order = excluded.sort_order;

-- Configuration prefill + skip logic (cf. migration 00111)
update public.questions set prefill_source = 'client.effectifs'
where template_id = '00000000-0000-0000-0000-000000000025' and code = 'CTX-02';

update public.questions set prefill_source = 'client.nombre_sites'
where template_id = '00000000-0000-0000-0000-000000000025' and code = 'CTX-03';

update public.questions set show_if = '{"question_code":"CTX-04","operator":"truthy"}'::jsonb
where template_id = '00000000-0000-0000-0000-000000000025' and code = 'CTX-05';

update public.questions set show_if = '{"question_code":"ACT-01","operator":"truthy"}'::jsonb
where template_id = '00000000-0000-0000-0000-000000000025' and code = 'ACT-02';
