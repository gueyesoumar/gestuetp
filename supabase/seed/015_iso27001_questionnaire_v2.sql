-- Seed: Questionnaire ISO 27001 v2 — Wizard conversationnel
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
  'Un RSSI ou responsable de la securite SI est-il nomme ?',
  'Responsable designe pour la securite de l''information, quel que soit son titre.',
  'boolean', null, true, 1),

('00000000-0000-0000-0000-000000000020', 'GOV-02',
  'Disposez-vous d''une politique de securite de l''information formalisee ?',
  'Document ecrit, approuve par la direction et diffuse aux collaborateurs.',
  'boolean', null, true, 2),

('00000000-0000-0000-0000-000000000020', 'GOV-03',
  'Disposez-vous d''une certification ISO 27001 ?',
  'Certification delivree par un organisme accredite.',
  'single_choice', '["Oui, en cours de validite", "En cours d''obtention", "Non", "Expiree"]', true, 3),

('00000000-0000-0000-0000-000000000020', 'GOV-04',
  'Existe-t-il un comite de securite de l''information ?',
  'Instance de gouvernance dediee a la SSI se reunissant periodiquement.',
  'boolean', null, true, 4),

-- ============================================================
-- SECTION 2 : Maturite & historique (MAT)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'MAT-01',
  'Une analyse de risques formelle a-t-elle ete realisee recemment ?',
  'Cartographie des risques SI realisee au cours des 12 derniers mois.',
  'boolean', null, true, 5),

('00000000-0000-0000-0000-000000000020', 'MAT-02',
  'Comment evaluez-vous la maturite SSI de votre organisation ?',
  'Auto-evaluation globale. Il n''y a pas de mauvaise reponse — cela nous aide a calibrer la mission.',
  'single_choice', '["1 — Inexistant : pas de pratique formalisee", "2 — Initial : pratiques ad hoc, non documentees", "3 — Defini : politiques et procedures documentees", "4 — Gere : mesure et suivi des indicateurs", "5 — Optimise : amelioration continue"]', true, 6),

('00000000-0000-0000-0000-000000000020', 'MAT-03',
  'Votre organisation a-t-elle connu des changements majeurs recemment ?',
  'Selectionnez tous les changements survenus au cours des 12 derniers mois.',
  'multiple_choice', '["Migration cloud", "Restructuration organisationnelle", "Fusion / Acquisition", "Forte croissance", "Nouvelle reglementation applicable", "Changement de DSI ou RSSI", "Incident de securite majeur", "Aucun changement majeur"]', true, 7),

-- ============================================================
-- SECTION 3 : Securite operationnelle (OPS)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'OPS-01',
  'Quelles fonctions de securite sont formalisees dans votre organisation ?',
  'Selectionnez toutes les fonctions en place avec des procedures documentees.',
  'multiple_choice', '["Gestion des acces (IAM)", "Inventaire des actifs", "Chiffrement des donnees", "Sauvegardes regulieres", "Journalisation / SIEM", "Gestion des vulnerabilites", "Tests d''intrusion", "Sensibilisation des employes", "Gestion des incidents", "Classification des donnees"]', true, 8),

('00000000-0000-0000-0000-000000000020', 'OPS-02',
  'Des services IT sont-ils externalises ?',
  'Selectionnez les domaines confies a un prestataire externe.',
  'multiple_choice', '["Hebergement / Data center", "Infogerance", "SOC / Surveillance securite", "Developpement applicatif", "Support utilisateurs", "Aucune externalisation"]', true, 9),

('00000000-0000-0000-0000-000000000020', 'OPS-03',
  'Un programme de sensibilisation a la securite est-il en place ?',
  'Formation ou campagne de sensibilisation destinee aux collaborateurs.',
  'single_choice', '["Oui, regulier (au moins annuel)", "Oui, ponctuel", "En cours de mise en place", "Non"]', true, 10),

-- ============================================================
-- SECTION 4 : Incidents & continuite (INC)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'INC-01',
  'Votre organisation a-t-elle subi des incidents de securite au cours des 12 derniers mois ?',
  'Tout evenement ayant impacte la confidentialite, l''integrite ou la disponibilite des systemes.',
  'single_choice', '["Non, aucun incident majeur", "Oui, un incident", "Oui, plusieurs incidents"]', true, 11),

('00000000-0000-0000-0000-000000000020', 'INC-02',
  'Disposez-vous d''un plan de continuite d''activite (PCA/PRA) ?',
  'Document formalise decrivant les procedures de reprise en cas de sinistre.',
  'single_choice', '["Oui, formalise et teste", "Oui, formalise mais non teste", "En cours de redaction", "Non"]', true, 12),

-- ============================================================
-- SECTION 5 : Attentes & contraintes (ATT)
-- ============================================================

('00000000-0000-0000-0000-000000000020', 'ATT-01',
  'Quels sont vos principaux enjeux pour cette mission ?',
  'Selectionnez 1 a 3 enjeux prioritaires.',
  'multiple_choice', '["Obtenir la certification ISO 27001", "Identifier les vulnerabilites", "Conformite reglementaire", "Rassurer partenaires et clients", "Ameliorer la maturite SSI", "Exigence investisseur ou maison mere", "Suite a un incident de securite"]', true, 13),

('00000000-0000-0000-0000-000000000020', 'ATT-02',
  'Y a-t-il des contraintes de planning a prendre en compte ?',
  'Periodes a eviter, deadlines reglementaires, disponibilite limitee...',
  'multiple_choice', '["Periode de cloture comptable", "Deadline reglementaire", "Conges / vacances", "Migration technique en cours", "Disponibilite limitee des equipes", "Aucune contrainte particuliere"]', false, 14);

-- Mettre a jour le template pour reflechir la v2
update public.questionnaire_templates
set version = '2.0',
    description = 'Questionnaire de prise de connaissance — format wizard conversationnel (14 questions, 5 sections)'
where id = '00000000-0000-0000-0000-000000000020';
