-- Seed: Questionnaire ISO 27001 v2 - Wizard conversationnel
-- Remplace les 15 anciennes questions par 14 revisees (0 textarea obligatoire)
-- Groupees par section : GOV, MAT, OPS, INC, ATT

-- Supprimer les anciennes questions
delete from public.questions
where template_id = '00000000-0000-0000-0000-000000000020';

-- Inserer les nouvelles questions
insert into public.questions (template_id, code, text, description, question_type, options, is_required, sort_order) values

-- ============================================================
-- SECTION 1 : Gouvernance SSI (GOV)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'GOV-01',
  'Un RSSI ou responsable de la sécurité SI est-il nommé ?',
  'Responsable désigné pour la sécurité de l''information, quel que soit son titre.',
  'boolean', null, true, 1),

('00000000-0000-0000-0000-000000000020', 'GOV-02',
  'Disposez-vous d''une politique de sécurité de l''information formalisée ?',
  'Document écrit, approuvé par la direction et diffusé aux collaborateurs.',
  'boolean', null, true, 2),

('00000000-0000-0000-0000-000000000020', 'GOV-03',
  'Disposez-vous d''une certification ISO 27001 ?',
  'Certification délivrée par un organisme accrédité.',
  'single_choice', '["Oui, en cours de validite", "En cours d''obtention", "Non", "Expiree"]', true, 3),

('00000000-0000-0000-0000-000000000020', 'GOV-04',
  'Existe-t-il un comité de sécurité de l''information ?',
  'Instance de gouvernance dédiée à la SSI se réunissant périodiquement.',
  'boolean', null, true, 4),

-- ============================================================
-- SECTION 2 : Maturite & historique (MAT)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'MAT-01',
  'Une analyse de risques formelle a-t-elle été réalisée récemment ?',
  'Cartographie des risques SI réalisée au cours des 12 derniers mois.',
  'boolean', null, true, 5),

('00000000-0000-0000-0000-000000000020', 'MAT-02',
  'Comment évaluez-vous la maturité SSI de votre organisation ?',
  'Auto-évaluation globale. Il n''y a pas de mauvaise réponse - cela nous aide à calibrer la mission.',
  'single_choice', '["1 - Inexistant : pas de pratique formalisee", "2 - Initial : pratiques ad hoc, non documentees", "3 - Defini : politiques et procedures documentees", "4 - Gere : mesure et suivi des indicateurs", "5 - Optimise : amelioration continue"]', true, 6),

('00000000-0000-0000-0000-000000000020', 'MAT-03',
  'Votre organisation a-t-elle connu des changements majeurs récemment ?',
  'Sélectionnez tous les changements survenus au cours des 12 derniers mois.',
  'multiple_choice', '["Migration cloud", "Restructuration organisationnelle", "Fusion / Acquisition", "Forte croissance", "Nouvelle reglementation applicable", "Changement de DSI ou RSSI", "Incident de securite majeur", "Aucun changement majeur"]', true, 7),

-- ============================================================
-- SECTION 3 : Securite operationnelle (OPS)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'OPS-01',
  'Quelles fonctions de sécurité sont formalisées dans votre organisation ?',
  'Sélectionnez toutes les fonctions en place avec des procédures documentées.',
  'multiple_choice', '["Gestion des acces (IAM)", "Inventaire des actifs", "Chiffrement des donnees", "Sauvegardes regulieres", "Journalisation / SIEM", "Gestion des vulnerabilites", "Tests d''intrusion", "Sensibilisation des employes", "Gestion des incidents", "Classification des donnees"]', true, 8),

('00000000-0000-0000-0000-000000000020', 'OPS-02',
  'Des services IT sont-ils externalisés ?',
  'Sélectionnez les domaines confiés à un prestataire externe.',
  'multiple_choice', '["Hebergement / Data center", "Infogerance", "SOC / Surveillance securite", "Developpement applicatif", "Support utilisateurs", "Aucune externalisation"]', true, 9),

('00000000-0000-0000-0000-000000000020', 'OPS-03',
  'Un programme de sensibilisation à la sécurité est-il en place ?',
  'Formation ou campagne de sensibilisation destinée aux collaborateurs.',
  'single_choice', '["Oui, regulier (au moins annuel)", "Oui, ponctuel", "En cours de mise en place", "Non"]', true, 10),

-- ============================================================
-- SECTION 4 : Incidents & continuite (INC)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'INC-01',
  'Votre organisation a-t-elle subi des incidents de sécurité au cours des 12 derniers mois ?',
  'Tout événement ayant impacté la confidentialité, l''intégrité ou la disponibilité des systèmes.',
  'single_choice', '["Non, aucun incident majeur", "Oui, un incident", "Oui, plusieurs incidents"]', true, 11),

('00000000-0000-0000-0000-000000000020', 'INC-02',
  'Disposez-vous d''un plan de continuité d''activité (PCA/PRA) ?',
  'Document formalisé décrivant les procédures de reprise en cas de sinistre.',
  'single_choice', '["Oui, formalise et teste", "Oui, formalise mais non teste", "En cours de redaction", "Non"]', true, 12),

-- ============================================================
-- SECTION 5 : Attentes & contraintes (ATT)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'ATT-01',
  'Quels sont vos principaux enjeux pour cette mission ?',
  'Sélectionnez 1 à 3 enjeux prioritaires.',
  'multiple_choice', '["Obtenir la certification ISO 27001", "Identifier les vulnerabilites", "Conformite reglementaire", "Rassurer partenaires et clients", "Ameliorer la maturite SSI", "Exigence investisseur ou maison mere", "Suite a un incident de securite"]', true, 13),

('00000000-0000-0000-0000-000000000020', 'ATT-02',
  'Y a-t-il des contraintes de planning à prendre en compte ?',
  'Périodes à éviter, deadlines réglementaires, disponibilité limitée...',
  'multiple_choice', '["Periode de cloture comptable", "Deadline reglementaire", "Conges / vacances", "Migration technique en cours", "Disponibilite limitee des equipes", "Aucune contrainte particuliere"]', false, 14)

on conflict (template_id, code) do update set
  text = excluded.text,
  description = excluded.description;

-- Mettre a jour le template pour reflechir la v2
update public.questionnaire_templates
set version = '2.0',
    description = 'Questionnaire de prise de connaissance - format wizard conversationnel (14 questions, 5 sections)'
where id = '00000000-0000-0000-0000-000000000020';
