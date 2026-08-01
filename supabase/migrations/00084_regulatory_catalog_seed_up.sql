-- Migration 00084: Catalogue des exigences réglementaires (seed → migration) — UP
--
-- Le contenu venait à l'origine de supabase/seed/014_regulatory_catalog.sql
-- mais les seeds ne s'exécutent pas en prod — seule la migration 00050 a posé
-- PSSI-ES, laissant les 21 autres entrées absentes en staging/prod.
--
-- Cette migration porte les 22 entrées (Sénégal, UEMOA, CIMA, CEDEAO,
-- International) dans le catalogue, en idempotent (ON CONFLICT (short_name)
-- DO NOTHING), donc PSSI-ES (déjà présent depuis 00050) n'est pas dupliqué
-- et toute ré-application est sûre.

-- ============================================================
-- SÉNÉGAL
-- ============================================================
INSERT INTO public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) VALUES
('CDP-SN', 'Loi n°2008-12 sur la protection des données à caractère personnel', 'legale', 'Sénégal',
  '{"Tous"}',
  'Loi sénégalaise relative à la protection des données à caractère personnel. Instituant la Commission des Données Personnelles (CDP) comme autorité de contrôle.',
  '[
    {"obligation": "Déclarer les traitements de données personnelles auprès de la CDP", "article": "Art. 18-22"},
    {"obligation": "Obtenir le consentement des personnes concernées", "article": "Art. 33"},
    {"obligation": "Garantir les droits d''accès, de rectification et de suppression", "article": "Art. 34-40"},
    {"obligation": "Assurer la confidentialité et la sécurité des données", "article": "Art. 41-43"},
    {"obligation": "Nommer un correspondant à la protection des données si requis", "article": "Art. 16"},
    {"obligation": "Notifier la CDP en cas de violation de données", "article": "Art. 44"},
    {"obligation": "Encadrer les transferts de données hors du Sénégal", "article": "Art. 49-52"}
  ]',
  'Amende de 1 à 100 millions FCFA et/ou emprisonnement de 1 à 7 ans',
  'Commission des Données Personnelles (CDP)', 'fort'),
('CYBER-SN', 'Loi n°2008-11 sur la cybercriminalité', 'legale', 'Sénégal',
  '{"Tous"}',
  'Loi pénale relative aux infractions liées aux technologies de l''information et de la communication.',
  '[
    {"obligation": "Protéger les systèmes d''information contre les accès non autorisés", "article": "Art. 4-5"},
    {"obligation": "Conserver les données de connexion pendant la durée légale", "article": "Art. 12"},
    {"obligation": "Coopérer avec les autorités judiciaires en cas d''enquête", "article": "Art. 14"},
    {"obligation": "Signaler les atteintes aux systèmes d''information", "article": "Art. 6-8"}
  ]',
  'Emprisonnement de 1 à 10 ans et amende de 5 à 100 millions FCFA selon l''infraction',
  'Ministère de la Justice / Tribunaux', 'fort'),
('SINFO-SN', 'Loi n°2008-10 relative aux transactions électroniques', 'legale', 'Sénégal',
  '{"Tous"}',
  'Cadre juridique pour le commerce électronique, la signature électronique et la preuve numérique au Sénégal.',
  '[
    {"obligation": "Reconnaître la validité juridique des documents électroniques", "article": "Art. 5-8"},
    {"obligation": "Utiliser des signatures électroniques certifiées pour les actes juridiques", "article": "Art. 15-20"},
    {"obligation": "Informer le consommateur avant toute transaction en ligne", "article": "Art. 25-30"},
    {"obligation": "Conserver les preuves électroniques pendant la durée légale", "article": "Art. 10-12"}
  ]',
  'Sanctions civiles et pénales selon la nature de l''infraction',
  'Ministère des Télécommunications', 'moyen'),
('BANK-SN', 'Loi n°2008-26 portant réglementation bancaire', 'legale', 'Sénégal',
  '{"Banque / Finance"}',
  'Réglementation de l''activité bancaire au Sénégal, incluant les obligations de contrôle interne et de gouvernance.',
  '[
    {"obligation": "Mettre en place un système de contrôle interne adéquat", "article": "Art. 45-48"},
    {"obligation": "Assurer la continuité des services bancaires essentiels", "article": "Art. 50"},
    {"obligation": "Respecter les ratios prudentiels (fonds propres, liquidité)", "article": "Art. 55-60"},
    {"obligation": "Produire des rapports périodiques à la BCEAO et à la Commission Bancaire", "article": "Art. 62-65"}
  ]',
  'Retrait d''agrément, sanctions pécuniaires de la Commission Bancaire',
  'Commission Bancaire de l''UMOA / BCEAO', 'fort'),
('DEC721-SN', 'Décret n°2008-721 portant application de la loi sur les données personnelles', 'reglementaire', 'Sénégal',
  '{"Tous"}',
  'Décret d''application de la loi 2008-12, précisant les modalités de déclaration, les catégories de données sensibles et les conditions de transfert.',
  '[
    {"obligation": "Respecter les modalités de déclaration simplifiée et normale", "article": "Art. 3-8"},
    {"obligation": "Identifier les traitements soumis à autorisation préalable", "article": "Art. 9-12"},
    {"obligation": "Définir les mesures de sécurité minimales pour les données sensibles", "article": "Art. 15-18"}
  ]',
  'Mêmes sanctions que la loi 2008-12',
  'Commission des Données Personnelles (CDP)', 'fort')
ON CONFLICT (short_name) DO NOTHING;

-- ============================================================
-- BCEAO / UEMOA
-- ============================================================
INSERT INTO public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) VALUES
('BCEAO-CI', 'Instruction n°008-05-2015 relative au contrôle interne des établissements de crédit', 'reglementaire', 'UEMOA',
  '{"Banque / Finance"}',
  'Instruction de la BCEAO définissant les exigences de contrôle interne pour les établissements de crédit de l''UEMOA.',
  '[
    {"obligation": "Mettre en place un dispositif de contrôle interne couvrant toutes les activités", "article": "Art. 4-8"},
    {"obligation": "Assurer la séparation des fonctions opérationnelles et de contrôle", "article": "Art. 9-10"},
    {"obligation": "Disposer d''une fonction d''audit interne indépendante", "article": "Art. 15-18"},
    {"obligation": "Établir un dispositif de gestion des risques opérationnels", "article": "Art. 20-25"},
    {"obligation": "Produire un rapport annuel de contrôle interne à la BCEAO", "article": "Art. 30"},
    {"obligation": "Assurer la traçabilité des opérations et la piste d''audit", "article": "Art. 12-14"}
  ]',
  'Injonctions, astreintes, sanctions disciplinaires de la Commission Bancaire',
  'BCEAO / Commission Bancaire de l''UMOA', 'fort'),
('BCEAO-SSI', 'Circulaire BCEAO relative à la sécurité des systèmes d''information des banques', 'reglementaire', 'UEMOA',
  '{"Banque / Finance"}',
  'Circulaire définissant les exigences de sécurité des systèmes d''information applicables aux établissements bancaires de la zone UEMOA.',
  '[
    {"obligation": "Formaliser une politique de sécurité des systèmes d''information", "article": "Section 1"},
    {"obligation": "Nommer un Responsable de la Sécurité des SI (RSSI)", "article": "Section 2"},
    {"obligation": "Réaliser une cartographie des risques SI", "article": "Section 3"},
    {"obligation": "Mettre en place un plan de continuité d''activité IT", "article": "Section 5"},
    {"obligation": "Effectuer des tests d''intrusion périodiques", "article": "Section 4"},
    {"obligation": "Encadrer l''externalisation des services IT", "article": "Section 6"},
    {"obligation": "Notifier les incidents de sécurité majeurs à la BCEAO", "article": "Section 7"}
  ]',
  'Injonctions de la Commission Bancaire, sanctions pouvant aller jusqu''au retrait d''agrément',
  'BCEAO / Commission Bancaire de l''UMOA', 'fort'),
('BCEAO-PAY', 'Règlement BCEAO relatif aux systèmes de paiement dans l''UEMOA', 'reglementaire', 'UEMOA',
  '{"Banque / Finance", "Technologies / IT"}',
  'Règlement encadrant les systèmes de paiement, la monnaie électronique et les services financiers numériques dans l''UEMOA.',
  '[
    {"obligation": "Obtenir l''agrément de la BCEAO pour les services de paiement", "article": "Art. 5-8"},
    {"obligation": "Assurer la sécurité et la fiabilité des transactions", "article": "Art. 15-18"},
    {"obligation": "Protéger les fonds des clients (cantonnement)", "article": "Art. 20-22"},
    {"obligation": "Mettre en place un dispositif de lutte contre la fraude", "article": "Art. 25-28"},
    {"obligation": "Respecter les plafonds de transactions pour la monnaie électronique", "article": "Art. 30-33"}
  ]',
  'Retrait d''agrément, amendes, interdiction d''exercer',
  'BCEAO', 'fort'),
('BCEAO-GOV', 'Instruction BCEAO relative à la gouvernance des systèmes d''information', 'reglementaire', 'UEMOA',
  '{"Banque / Finance"}',
  'Instruction définissant les principes de gouvernance IT que doivent respecter les établissements de crédit de l''UEMOA.',
  '[
    {"obligation": "Définir une stratégie SI alignée avec la stratégie métier", "article": "Section 1"},
    {"obligation": "Mettre en place un comité de gouvernance IT", "article": "Section 2"},
    {"obligation": "Allouer des ressources adéquates à la fonction SI", "article": "Section 3"},
    {"obligation": "Assurer la gestion des projets IT selon une méthodologie formalisée", "article": "Section 4"},
    {"obligation": "Mesurer et rapporter la performance IT", "article": "Section 5"}
  ]',
  'Injonctions de la Commission Bancaire',
  'BCEAO / Commission Bancaire de l''UMOA', 'moyen'),
('UEMOA-LCB', 'Directive UEMOA relative à la lutte contre le blanchiment de capitaux et le financement du terrorisme', 'reglementaire', 'UEMOA',
  '{"Banque / Finance", "Assurance"}',
  'Cadre réglementaire de la lutte contre le blanchiment et le financement du terrorisme dans l''espace UEMOA.',
  '[
    {"obligation": "Identifier et vérifier l''identité des clients (KYC)", "article": "Art. 10-15"},
    {"obligation": "Mettre en place un dispositif de vigilance et de surveillance des transactions", "article": "Art. 20-25"},
    {"obligation": "Déclarer les opérations suspectes à la CENTIF", "article": "Art. 30-33"},
    {"obligation": "Former le personnel à la détection des opérations suspectes", "article": "Art. 35"},
    {"obligation": "Conserver les documents et données pendant 10 ans minimum", "article": "Art. 40"},
    {"obligation": "Nommer un correspondant LCB-FT", "article": "Art. 38"}
  ]',
  'Sanctions pénales et administratives, retrait d''agrément',
  'CENTIF / BCEAO / Commission Bancaire', 'fort')
ON CONFLICT (short_name) DO NOTHING;

-- ============================================================
-- CIMA (Assurances)
-- ============================================================
INSERT INTO public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) VALUES
('CIMA-GOV', 'Code CIMA — Gouvernance et contrôle interne des sociétés d''assurance', 'reglementaire', 'CIMA',
  '{"Assurance"}',
  'Dispositions du Code CIMA relatives à la gouvernance, au contrôle interne et à la gestion des risques des compagnies d''assurance de la zone CIMA.',
  '[
    {"obligation": "Mettre en place un système de gouvernance efficace", "article": "Art. 329-1 et suivants"},
    {"obligation": "Disposer de fonctions clés : audit interne, conformité, gestion des risques, actuariat", "article": "Art. 329-3"},
    {"obligation": "Réaliser une évaluation interne des risques et de la solvabilité (ORSA)", "article": "Art. 329-10"},
    {"obligation": "Assurer la continuité d''activité", "article": "Art. 329-15"},
    {"obligation": "Produire des rapports réglementaires à la CRCA", "article": "Art. 329-20"}
  ]',
  'Sanctions de la CRCA : avertissement, blâme, limitation d''activité, retrait d''agrément',
  'Commission Régionale de Contrôle des Assurances (CRCA)', 'fort')
ON CONFLICT (short_name) DO NOTHING;

-- ============================================================
-- CEDEAO
-- ============================================================
INSERT INTO public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) VALUES
('CEDEAO-DP', 'Acte additionnel A/SA.1/01/10 relatif à la protection des données à caractère personnel dans l''espace CEDEAO', 'legale', 'CEDEAO',
  '{"Tous"}',
  'Acte additionnel de la CEDEAO établissant un cadre harmonisé de protection des données personnelles pour les 15 États membres.',
  '[
    {"obligation": "Créer une autorité nationale de protection des données", "article": "Art. 14"},
    {"obligation": "Garantir le consentement éclairé pour le traitement des données", "article": "Art. 22-24"},
    {"obligation": "Assurer la sécurité et la confidentialité des données", "article": "Art. 30-32"},
    {"obligation": "Encadrer les transferts transfrontaliers de données", "article": "Art. 36-38"},
    {"obligation": "Garantir les droits des personnes concernées", "article": "Art. 25-29"}
  ]',
  'Sanctions définies par chaque État membre selon sa législation nationale',
  'Autorités nationales de protection des données', 'moyen'),
('CEDEAO-TE', 'Acte additionnel A/SA.2/01/10 relatif aux transactions électroniques dans l''espace CEDEAO', 'legale', 'CEDEAO',
  '{"Tous"}',
  'Cadre harmonisé de la CEDEAO pour les transactions électroniques, la signature numérique et le commerce en ligne.',
  '[
    {"obligation": "Reconnaître la valeur juridique des documents et signatures électroniques", "article": "Art. 5-8"},
    {"obligation": "Assurer la sécurité des transactions électroniques", "article": "Art. 15-18"},
    {"obligation": "Protéger le consommateur dans les transactions en ligne", "article": "Art. 20-25"},
    {"obligation": "Encadrer la publicité et le marketing électronique", "article": "Art. 30-33"}
  ]',
  'Sanctions définies par chaque État membre',
  'Autorités nationales de régulation des télécommunications', 'moyen')
ON CONFLICT (short_name) DO NOTHING;

-- ============================================================
-- INTERNATIONAL (applicable au Sénégal)
-- ============================================================
INSERT INTO public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) VALUES
('RGPD', 'Règlement Général sur la Protection des Données (UE) 2016/679', 'legale', 'International',
  '{"Tous"}',
  'Règlement européen applicable aux entreprises sénégalaises qui traitent des données de résidents européens ou qui opèrent dans l''UE.',
  '[
    {"obligation": "Tenir un registre des traitements", "article": "Art. 30"},
    {"obligation": "Nommer un DPO si requis", "article": "Art. 37-39"},
    {"obligation": "Réaliser des analyses d''impact (AIPD) pour les traitements à risque", "article": "Art. 35"},
    {"obligation": "Notifier les violations de données dans les 72h", "article": "Art. 33-34"},
    {"obligation": "Garantir les droits des personnes (accès, portabilité, oubli)", "article": "Art. 15-22"},
    {"obligation": "Assurer la sécurité des traitements (chiffrement, pseudonymisation)", "article": "Art. 32"},
    {"obligation": "Encadrer les transferts hors UE par des garanties appropriées", "article": "Art. 44-49"}
  ]',
  'Jusqu''à 20M€ ou 4% du CA mondial annuel',
  'Autorités de protection des données européennes (CNIL, etc.)', 'fort'),
('PCI-DSS', 'PCI DSS — Payment Card Industry Data Security Standard', 'normative', 'International',
  '{"Banque / Finance", "Commerce / Distribution", "Technologies / IT"}',
  'Norme de sécurité des données de l''industrie des cartes de paiement, obligatoire pour toute entité qui stocke, traite ou transmet des données de cartes.',
  '[
    {"obligation": "Installer et maintenir un pare-feu pour protéger les données des titulaires de cartes", "article": "Exigence 1"},
    {"obligation": "Ne pas utiliser les paramètres par défaut des fournisseurs pour les mots de passe", "article": "Exigence 2"},
    {"obligation": "Protéger les données stockées des titulaires de cartes", "article": "Exigence 3"},
    {"obligation": "Chiffrer la transmission des données des titulaires sur les réseaux publics", "article": "Exigence 4"},
    {"obligation": "Maintenir un programme de gestion des vulnérabilités", "article": "Exigence 5-6"},
    {"obligation": "Mettre en œuvre des mesures de contrôle d''accès strictes", "article": "Exigence 7-9"},
    {"obligation": "Surveiller et tester régulièrement les réseaux", "article": "Exigence 10-11"},
    {"obligation": "Maintenir une politique de sécurité de l''information", "article": "Exigence 12"}
  ]',
  'Amendes des réseaux de cartes (Visa, Mastercard), responsabilité en cas de fraude, perte du droit de traiter les cartes',
  'PCI Security Standards Council / Réseaux de cartes', 'fort'),
('BALE-III', 'Accords de Bâle II/III — Exigences prudentielles bancaires', 'normative', 'International',
  '{"Banque / Finance"}',
  'Normes internationales du Comité de Bâle sur le contrôle bancaire, relatives aux fonds propres, à la gestion des risques et à la transparence.',
  '[
    {"obligation": "Respecter les ratios minimaux de fonds propres (Pilier 1)", "article": "Pilier 1"},
    {"obligation": "Mettre en place un processus d''évaluation de l''adéquation des fonds propres (ICAAP)", "article": "Pilier 2"},
    {"obligation": "Publier des informations sur les risques et l''adéquation des fonds propres", "article": "Pilier 3"},
    {"obligation": "Gérer le risque opérationnel incluant le risque IT", "article": "Pilier 1 - Approche standard"},
    {"obligation": "Disposer d''un cadre de gouvernance des risques robuste", "article": "Principes fondamentaux"}
  ]',
  'Sanctions de la Commission Bancaire selon le cadre UEMOA',
  'Comité de Bâle / BCEAO / Commission Bancaire', 'fort'),
('ISO27001-REQ', 'ISO/IEC 27001 — Certification requise contractuellement', 'normative', 'International',
  '{"Tous"}',
  'Lorsqu''un client, un partenaire ou un donneur d''ordre exige une certification ISO 27001 comme condition contractuelle.',
  '[
    {"obligation": "Mettre en place un SMSI conforme à la norme ISO 27001", "article": "Clause 4-10"},
    {"obligation": "Réaliser et maintenir une analyse de risques", "article": "Clause 6.1.2"},
    {"obligation": "Implémenter les contrôles de l''Annexe A applicables", "article": "Annexe A"},
    {"obligation": "Réaliser des audits internes et une revue de direction", "article": "Clause 9"},
    {"obligation": "Obtenir et maintenir la certification par un organisme accrédité", "article": "Certification"}
  ]',
  'Non-conformité contractuelle, perte de marchés, résiliation de contrats',
  'Organismes de certification accrédités', 'fort'),
('SOC2', 'SOC 2 — Service Organization Control 2', 'normative', 'International',
  '{"Technologies / IT", "Services aux entreprises"}',
  'Norme d''audit développée par l''AICPA, évaluant les contrôles de sécurité, disponibilité, intégrité, confidentialité et vie privée des fournisseurs de services.',
  '[
    {"obligation": "Implémenter des contrôles sur les 5 critères de confiance (Trust Service Criteria)", "article": "TSC"},
    {"obligation": "Faire auditer les contrôles par un auditeur indépendant", "article": "Rapport Type I ou II"},
    {"obligation": "Documenter les politiques, procédures et preuves de contrôle", "article": "Description du système"},
    {"obligation": "Surveiller et corriger les défaillances de contrôle", "article": "Monitoring"}
  ]',
  'Perte de confiance des clients, impact commercial',
  'AICPA / Auditeurs CPA indépendants', 'moyen')
ON CONFLICT (short_name) DO NOTHING;

-- Contrôle post-migration
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.regulatory_catalog;
  RAISE NOTICE '[00084] regulatory_catalog total rows: %', v_count;
END $$;
