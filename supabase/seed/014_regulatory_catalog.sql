-- Seed: Catalogue des exigences réglementaires
-- Sénégal, UEMOA/BCEAO, CIMA, CEDEAO, International

-- ============================================================
-- SÉNÉGAL
-- ============================================================

insert into public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) values

-- Loi 2008-12 Protection des données personnelles
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

-- Loi 2008-11 Cybercriminalité
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

-- Loi 2008-10 Société de l'information
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

-- Loi 2008-26 Loi bancaire
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

-- Décret 2008-721
('DEC721-SN', 'Décret n°2008-721 portant application de la loi sur les données personnelles', 'reglementaire', 'Sénégal',
  '{"Tous"}',
  'Décret d''application de la loi 2008-12, précisant les modalités de déclaration, les catégories de données sensibles et les conditions de transfert.',
  '[
    {"obligation": "Respecter les modalités de déclaration simplifiée et normale", "article": "Art. 3-8"},
    {"obligation": "Identifier les traitements soumis à autorisation préalable", "article": "Art. 9-12"},
    {"obligation": "Définir les mesures de sécurité minimales pour les données sensibles", "article": "Art. 15-18"}
  ]',
  'Mêmes sanctions que la loi 2008-12',
  'Commission des Données Personnelles (CDP)', 'fort'),

-- PSSI-ES — Instruction présidentielle N° 003/PR du 03 janvier 2017
-- Commission Nationale de Cryptologie — Présidence de la République du Sénégal
('PSSI-ES', 'Instruction présidentielle N° 003/PR relative à la Politique de Sécurité des Systèmes d''Information de l''État du Sénégal (PSSI-ES)', 'reglementaire', 'Sénégal',
  '{"Administration publique", "Défense", "Tous"}',
  'Instruction présidentielle signée le 03 janvier 2017 par la Commission Nationale de Cryptologie. Elle fixe les principes et les règles de sécurité applicables à tous les systèmes d''information des entités de l''État (Ministères, Institutions, Organismes nationaux, Directions générales, Services déconcentrés, Autorités administratives). Structurée en 8 articles et une annexe de 11 chapitres (30 objectifs, 150+ règles), elle couvre l''organisation, la sécurité du personnel, l''acquisition/développement, la gestion des actifs, les fournisseurs, la sécurité physique, la sécurité logique, l''exploitation, le cloud/mobile/télétravail, la gestion des incidents et l''audit/conformité.',
  '[
    {"obligation": "Mettre en place une organisation de sécurité à 3 niveaux : décisionnel (Ministre/HFD), pilotage (Comité de sécurité/AQSSI), opérationnel (ASSI)", "article": "Art. 4 / Chap. I — Obj. 1, REG 1-1 à 1-6"},
    {"obligation": "Nommer des AQSSI (Autorités Qualifiées pour la Sécurité des SI) et des ASSI (Agents de Sécurité des SI) dans chaque entité", "article": "Art. 4 / Chap. I — REG 1-4"},
    {"obligation": "Habiliter le personnel accédant aux informations sensibles : enquêtes de sécurité et de moralité, charte de confidentialité signée", "article": "Chap. II — Obj. 2, REG 2-3"},
    {"obligation": "Informer les agents de leurs responsabilités SSI dès l''embauche et prévoir les sanctions en cas de violation", "article": "Chap. II — Obj. 2, REG 2-1, 2-4"},
    {"obligation": "Sensibiliser et former régulièrement tout le personnel à la sécurité SI via un programme adapté par catégorie", "article": "Chap. II — Obj. 4, REG 4-1 à 4-6"},
    {"obligation": "Gérer les droits d''accès en cas de mouvement de personnel (arrivée, mutation, départ)", "article": "Chap. II — Obj. 3, REG 3-1"},
    {"obligation": "Intégrer la sécurité dès l''acquisition de nouveaux systèmes et le développement de logiciels (cycle de vie sécurisé)", "article": "Chap. III — Obj. 5, REG 5-1 à 5-4"},
    {"obligation": "Inventorier les actifs, les classifier selon leur sensibilité et les affecter à des responsables désignés", "article": "Chap. IV — Obj. 6, REG 6-1 à 6-5"},
    {"obligation": "Protéger les supports d''information amovibles contre la divulgation, la modification ou la destruction", "article": "Chap. IV — REG 6-6, 6-7"},
    {"obligation": "Mettre en place une politique de sécurité fournisseurs : charte, audits des prestations, conformité de la chaîne d''approvisionnement", "article": "Chap. V — Obj. 7, REG 7-1 à 7-9"},
    {"obligation": "Définir des zones sécurisées avec contrôle d''accès physique, registre d''entrée et agent de sécurité", "article": "Chap. VI — Obj. 8, REG 8-1 à 8-8, REG 9-1 à 9-4"},
    {"obligation": "Protéger les matériels : emplacement sécurisé, alimentation redondante, câblage protégé, maintenance tracée", "article": "Chap. VI — Obj. 13, REG 13-1 à 13-16, REG 14-1 à 14-7, REG 15-1 à 15-8"},
    {"obligation": "Appliquer le principe du besoin d''en connaître et d''utiliser : cloisonnement des rôles, revue régulière des droits d''accès", "article": "Chap. VII — Obj. 17, REG 17-1 à 17-6"},
    {"obligation": "Sécuriser les applicatifs : contrôle d''accès, authentification forte pour données classifiées, limitation des connexions non autorisées, mots de passe robustes", "article": "Chap. VII — Obj. 18, REG 18-1 à 18-12"},
    {"obligation": "Sécuriser les échanges réseau : politique d''accès, chiffrement labellisé par la Commission nationale de cryptologie, segmentation des réseaux", "article": "Chap. VII — Obj. 19, REG 19-1 à 19-9-13"},
    {"obligation": "Documenter les procédures d''exploitation, de configuration, de sauvegarde et de redémarrage de chaque système", "article": "Chap. VIII — Obj. 20, REG 20-1 à 20-8"},
    {"obligation": "Gérer les changements via un processus formel d''autorisation avec évaluation d''impact sécurité", "article": "Chap. VIII — Obj. 21, REG 21-1 à 21-8"},
    {"obligation": "Séparer les environnements de développement, de test et d''exploitation", "article": "Chap. VIII — Obj. 22, REG 22-1 à 22-7"},
    {"obligation": "Protéger contre les logiciels malveillants : antivirus sur tous les postes, anti-spams, filtres de contenu, procédures de continuité post-attaque", "article": "Chap. VIII — Obj. 23, REG 23-1 à 23-10"},
    {"obligation": "Sauvegarder périodiquement les données (incrémentielle quotidienne, complète hebdomadaire), chiffrer les sauvegardes sensibles, tester la restauration", "article": "Chap. VIII — Obj. 24, REG 24-1 à 24-8"},
    {"obligation": "Journaliser les événements de sécurité, protéger les journaux contre la falsification, les analyser par des outils automatiques et les vérifier en permanence", "article": "Chap. VIII — Obj. 25, REG 25-1 à 25-7"},
    {"obligation": "Héberger les données sensibles de l''Administration sur le territoire national (sauf dérogation motivée du HFD)", "article": "Chap. IX — Obj. 28, REG 28-2"},
    {"obligation": "Encadrer le cloud, les appareils mobiles et le télétravail : analyse de risques, chiffrement labellisé, politique de contrôle d''accès mobile, effacement à distance", "article": "Chap. IX — Obj. 28, REG 28-1 à 28-10"},
    {"obligation": "Mettre en œuvre des procédures de détection, signalement et réponse aux incidents SSI ; structure d''alerte avec point focal vers ADIE, STCC-SSI, ARTP", "article": "Chap. X — Obj. 29, REG 29-1 à 29-11"},
    {"obligation": "Disposer d''un plan de continuité d''activité, le tester périodiquement et le maintenir à jour", "article": "Chap. X — REG 29-4 à 29-6"},
    {"obligation": "Effectuer des audits de conformité SSI réguliers par des auditeurs compétents ; rapports communiqués à la Commission nationale de cryptologie puis au Président de la République", "article": "Chap. XI — Obj. 30, REG 30-1 à 30-7"},
    {"obligation": "Appliquer les mesures de conformité proposées suite aux audits et en rendre compte", "article": "Chap. XI — REG 30-4"}
  ]',
  'Sanctions administratives et disciplinaires (Code pénal art. 60-64 et 363 ; loi 61-33 du 15 juin 1961 portant statut général des fonctionnaires art. 14). Engagement de la responsabilité personnelle des dirigeants et agents.',
  'Commission Nationale de Cryptologie / Présidence de la République du Sénégal', 'fort');

-- ============================================================
-- BCEAO / UEMOA
-- ============================================================

insert into public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) values

-- Instruction BCEAO contrôle interne
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

-- Circulaire BCEAO sécurité SI
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

-- Règlement systèmes de paiement
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

-- Instruction gouvernance SI BCEAO
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

-- Directive LCB-FT
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
  'CENTIF / BCEAO / Commission Bancaire', 'fort');

-- ============================================================
-- CIMA (Assurances)
-- ============================================================

insert into public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) values

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
  'Commission Régionale de Contrôle des Assurances (CRCA)', 'fort');

-- ============================================================
-- CEDEAO
-- ============================================================

insert into public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) values

-- Protection données personnelles CEDEAO
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

-- Transactions électroniques CEDEAO
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
  'Autorités nationales de régulation des télécommunications', 'moyen');

-- ============================================================
-- INTERNATIONAL (applicable au Sénégal)
-- ============================================================

insert into public.regulatory_catalog (short_name, name, type, jurisdiction, applicable_sectors, description, key_obligations, penalties, authority, impact) values

-- RGPD
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

-- PCI-DSS
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

-- Bâle II/III
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

-- ISO 27001 comme exigence (quand contractuellement requise)
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

-- SOC 2
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
  'AICPA / Auditeurs CPA indépendants', 'moyen');
