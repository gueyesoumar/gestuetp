-- Seed: Référentiel Audit SI — 6 domaines, 79 contrôles
-- Référentiel composite : COBIT + ITIL + ISO 27001 + RGPD

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000014',
  'Audit SI',
  'audit-si',
  'Référentiel composite d''audit du système d''information. Couvre la gouvernance, les risques, l''architecture, les données, les services et la sécurité SI en s''appuyant sur COBIT, ITIL, ISO 27001 et le RGPD.',
  '1.0',
  'Gëstu'
);

-- ============================================================
-- Domaines
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000014', 'GO', 'Gouvernance & Organisation SI', 'Cadre de gouvernance, alignement stratégique, organisation de la DSI, compétences et conformité', 1),
('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000014', 'GR', 'Gestion des risques SI', 'Identification, évaluation, traitement et suivi des risques liés au système d''information', 2),
('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0000-000000000014', 'AE', 'Architecture d''entreprise', 'Schéma directeur, cartographies, principes d''architecture, veille technologique et transformation digitale', 3),
('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-000000000014', 'GD', 'Gouvernance & Gestion des données', 'Classification, protection des données personnelles, conservation, transferts et propriété intellectuelle', 4),
('00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0000-000000000014', 'GS', 'Gestion des services SI', 'Exploitation, support, incidents, problèmes, changements, actifs, sauvegarde, disponibilité, continuité et développement', 5),
('00000000-0000-0000-0005-000000000006', '00000000-0000-0000-0000-000000000014', 'MS', 'Management de la Sécurité SI', 'Politique de sécurité, parties externes, ressources humaines, sécurité physique, gestion des accès, données et réseaux', 6);

-- ============================================================
-- GO — Gouvernance & Organisation SI (12 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000001', 'GO.01', 'Cadre de gouvernance SI défini et approuvé', 'Un cadre de gouvernance IT est formalisé, approuvé par la direction et communiqué', 'Mapping : COBIT EDM01', 1),
('00000000-0000-0000-0005-000000000001', 'GO.02', 'Alignement SI/métier documenté', 'La contribution de la valeur métier des processus et services IT est optimisée', 'Mapping : COBIT EDM02', 2),
('00000000-0000-0000-0005-000000000001', 'GO.03', 'Comité de pilotage SI en place et actif', 'Un comité de pilotage SI se réunit régulièrement avec des PV documentés', 'Mapping : COBIT EDM01/EDM05', 3),
('00000000-0000-0000-0005-000000000001', 'GO.04', 'Rôles et responsabilités SI formalisés', 'Les rôles et responsabilités en matière de SI sont définis et attribués', 'Mapping : COBIT APO01 / ISO A.5.2', 4),
('00000000-0000-0000-0005-000000000001', 'GO.05', 'Organisation de la DSI documentée', 'L''organigramme de la DSI est formalisé avec les périmètres de responsabilité', 'Mapping : COBIT APO01', 5),
('00000000-0000-0000-0005-000000000001', 'GO.06', 'Budget SI défini, suivi et optimisé', 'Le budget IT est défini, suivi périodiquement et les écarts sont analysés', 'Mapping : COBIT APO06 / EDM04', 6),
('00000000-0000-0000-0005-000000000001', 'GO.07', 'Reporting SI à la direction', 'La mesure et le reporting de performance IT sont transparents et réguliers', 'Mapping : COBIT EDM05 / ITIL GMP.05', 7),
('00000000-0000-0000-0005-000000000001', 'GO.08', 'Gestion des compétences et formation SI', 'Les compétences SI sont cartographiées et un plan de formation est en place', 'Mapping : COBIT APO07 / ISO A.6.3', 8),
('00000000-0000-0000-0005-000000000001', 'GO.09', 'Gestion des relations métier', 'Les relations entre l''IT et les parties prenantes métier sont formalisées', 'Mapping : COBIT APO08 / ITIL GMP.09', 9),
('00000000-0000-0000-0005-000000000001', 'GO.10', 'Gestion de la qualité SI', 'Les exigences de qualité sont définies et un processus de suivi est en place', 'Mapping : COBIT APO11', 10),
('00000000-0000-0000-0005-000000000001', 'GO.11', 'Conformité aux exigences légales et réglementaires', 'Les exigences légales, réglementaires et contractuelles applicables au SI sont identifiées et suivies', 'Mapping : COBIT MEA03 / ISO A.5.31', 11),
('00000000-0000-0000-0005-000000000001', 'GO.12', 'Programme d''audit interne SI et amélioration continue', 'Un programme d''audit interne SI est formalisé et alimente un processus d''amélioration continue', 'Mapping : COBIT MEA02 / ISO A.5.35 / ITIL GMP.02', 12);

-- ============================================================
-- GR — Gestion des risques SI (7 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000002', 'GR.01', 'Appétence au risque IT définie par la direction', 'Le niveau de risque acceptable est défini et validé par la direction', 'Mapping : COBIT EDM03', 1),
('00000000-0000-0000-0005-000000000002', 'GR.02', 'Méthodologie d''analyse de risques SI formalisée', 'Une méthodologie d''analyse de risques est documentée et appliquée', 'Mapping : COBIT APO12 / ISO 27005', 2),
('00000000-0000-0000-0005-000000000002', 'GR.03', 'Cartographie des risques SI à jour', 'Les risques SI sont identifiés, évalués et cartographiés régulièrement', 'Mapping : COBIT APO12', 3),
('00000000-0000-0000-0005-000000000002', 'GR.04', 'Plans de traitement des risques', 'Des plans de traitement sont définis pour chaque risque identifié', 'Mapping : COBIT APO12', 4),
('00000000-0000-0000-0005-000000000002', 'GR.05', 'Veille sur les menaces et vulnérabilités', 'Les informations sur les menaces et vulnérabilités sont collectées et analysées', 'Mapping : ISO A.5.7 / A.8.8', 5),
('00000000-0000-0000-0005-000000000002', 'GR.06', 'Revue périodique des risques', 'Les risques sont revus périodiquement et les plans de traitement mis à jour', 'Mapping : COBIT APO12 / ITIL GMP.10', 6),
('00000000-0000-0000-0005-000000000002', 'GR.07', 'Intégration des risques SI dans la gestion des risques groupe', 'Les risques SI sont intégrés dans le dispositif global de gestion des risques de l''organisation', 'Mapping : COBIT EDM03', 7);

-- ============================================================
-- AE — Architecture d'entreprise (8 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000003', 'AE.01', 'Schéma directeur SI formalisé et à jour', 'Un schéma directeur SI est défini, aligné avec la stratégie métier', 'Mapping : COBIT APO02', 1),
('00000000-0000-0000-0005-000000000003', 'AE.02', 'Architecture d''entreprise documentée', 'Les couches métier, applicative, technique et données sont documentées', 'Mapping : COBIT APO03 / ITIL GMP.01', 2),
('00000000-0000-0000-0005-000000000003', 'AE.03', 'Cartographie applicative à jour', 'L''inventaire des applications avec leurs interdépendances est maintenu', 'Mapping : COBIT APO03', 3),
('00000000-0000-0000-0005-000000000003', 'AE.04', 'Architecture réseau et infrastructure documentée', 'Les schémas réseau, les zones de sécurité et l''infrastructure sont documentés', 'Mapping : ISO A.8.20 / COBIT APO03', 4),
('00000000-0000-0000-0005-000000000003', 'AE.05', 'Principes d''architecture sécurisée (security by design)', 'Les principes de sécurité by design et défense en profondeur sont appliqués', 'Mapping : ISO A.8.27', 5),
('00000000-0000-0000-0005-000000000003', 'AE.06', 'Veille technologique et innovation', 'Un processus de veille technologique est en place pour identifier les opportunités', 'Mapping : COBIT APO04', 6),
('00000000-0000-0000-0005-000000000003', 'AE.07', 'Plan de transformation digitale', 'Un plan de transformation digitale est défini et suivi', 'Mapping : COBIT APO02', 7),
('00000000-0000-0000-0005-000000000003', 'AE.08', 'Gestion du portefeuille de projets et services', 'Le portefeuille de projets et services est géré avec des critères de priorisation', 'Mapping : COBIT APO05 / ITIL GMP.07', 8);

-- ============================================================
-- GD — Gouvernance & Gestion des données (10 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000004', 'GD.01', 'Politique de gestion des données', 'Une politique de gestion des données est formalisée et approuvée', 'Mapping : COBIT APO14', 1),
('00000000-0000-0000-0005-000000000004', 'GD.02', 'Classification des informations', 'Les informations sont classifiées selon leur niveau de sensibilité', 'Mapping : ISO A.5.12-13', 2),
('00000000-0000-0000-0005-000000000004', 'GD.03', 'Inventaire des actifs informationnels', 'Un inventaire complet des actifs matériels, logiciels et données est maintenu', 'Mapping : ISO A.5.9', 3),
('00000000-0000-0000-0005-000000000004', 'GD.04', 'Registre des traitements de données personnelles', 'Un registre des traitements conforme à l''article 30 du RGPD est tenu', 'Mapping : ISO A.5.34 / RGPD Art.30', 4),
('00000000-0000-0000-0005-000000000004', 'GD.05', 'Analyses d''impact sur la vie privée (AIPD)', 'Des analyses d''impact sont réalisées pour les traitements à risque', 'Mapping : ISO A.5.34 / RGPD', 5),
('00000000-0000-0000-0005-000000000004', 'GD.06', 'Droits des personnes concernées', 'Les processus d''exercice des droits (accès, rectification, suppression) sont en place', 'Mapping : RGPD', 6),
('00000000-0000-0000-0005-000000000004', 'GD.07', 'Politique de conservation, archivage et suppression', 'Les durées de conservation sont définies et les processus de suppression sécurisée appliqués', 'Mapping : ISO A.5.33 / A.8.10', 7),
('00000000-0000-0000-0005-000000000004', 'GD.08', 'Transferts de données encadrés', 'Les transferts de données sont sécurisés et conformes aux exigences réglementaires', 'Mapping : ISO A.5.14', 8),
('00000000-0000-0000-0005-000000000004', 'GD.09', 'Protection des enregistrements réglementaires', 'Les enregistrements réglementaires sont protégés contre la perte et l''altération', 'Mapping : ISO A.5.33', 9),
('00000000-0000-0000-0005-000000000004', 'GD.10', 'Gestion des licences et propriété intellectuelle', 'La conformité des licences logicielles est suivie et la propriété intellectuelle protégée', 'Mapping : ISO A.5.32', 10);

-- ============================================================
-- GS — Gestion des services SI (22 contrôles)
-- ============================================================

-- 5.1 Exploitation & support
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.01', 'Catalogue de services SI', 'Un catalogue des services IT est formalisé et accessible', 'Mapping : ITIL SMP.10. Sous-section : Exploitation & support', 1),
('00000000-0000-0000-0005-000000000005', 'GS.02', 'Accords de niveaux de service (SLA)', 'Des SLA sont définis et suivis pour les services critiques', 'Mapping : ITIL SMP.15 / COBIT APO09. Sous-section : Exploitation & support', 2),
('00000000-0000-0000-0005-000000000005', 'GS.03', 'Centre de services (Service Desk)', 'Un point de contact unique pour les demandes et incidents est en place', 'Mapping : ITIL SMP.14. Sous-section : Exploitation & support', 3),
('00000000-0000-0000-0005-000000000005', 'GS.04', 'Procédures d''exploitation documentées', 'Les procédures opérationnelles clés sont documentées et maintenues', 'Mapping : ISO A.5.37 / COBIT DSS01. Sous-section : Exploitation & support', 4);

-- 5.2 Incidents & problèmes
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.05', 'Gestion des incidents', 'Un processus de gestion des incidents est en place pour minimiser l''impact', 'Mapping : ITIL SMP.05 / COBIT DSS02. Sous-section : Incidents & problèmes', 5),
('00000000-0000-0000-0005-000000000005', 'GS.06', 'Gestion des problèmes', 'Les causes racines des incidents récurrents sont identifiées et traitées', 'Mapping : ITIL SMP.08 / COBIT DSS03. Sous-section : Incidents & problèmes', 6);

-- 5.3 Changements
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.07', 'Processus de gestion des changements', 'Tous les changements IT sont gérés de manière contrôlée', 'Mapping : COBIT BAI06 / ITIL SMP.04. Sous-section : Changements', 7),
('00000000-0000-0000-0005-000000000005', 'GS.08', 'Comité d''approbation des changements (CAB)', 'Un comité valide les changements significatifs avant déploiement', 'Mapping : ITIL SMP.04. Sous-section : Changements', 8),
('00000000-0000-0000-0005-000000000005', 'GS.09', 'Gestion des mises en production', 'Les mises en production sont planifiées, testées et tracées', 'Mapping : ITIL SMP.09 / COBIT BAI07. Sous-section : Changements', 9);

-- 5.4 Actifs & configuration
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.10', 'Gestion des actifs IT (cycle de vie)', 'Les actifs IT sont gérés tout au long de leur cycle de vie', 'Mapping : ITIL SMP.06 / COBIT BAI09. Sous-section : Actifs & configuration', 10),
('00000000-0000-0000-0005-000000000005', 'GS.11', 'Gestion de la configuration (CMDB)', 'Les descriptions et relations des ressources clés sont maintenues', 'Mapping : COBIT BAI10 / ITIL SMP.11. Sous-section : Actifs & configuration', 11);

-- 5.5 Sauvegarde & restauration
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.12', 'Politique de sauvegarde', 'La fréquence, la rétention et le périmètre des sauvegardes sont définis', 'Mapping : ISO A.8.13. Sous-section : Sauvegarde & restauration', 12),
('00000000-0000-0000-0005-000000000005', 'GS.13', 'Tests de restauration périodiques', 'Les procédures de restauration sont testées régulièrement', 'Mapping : ISO A.8.13. Sous-section : Sauvegarde & restauration', 13);

-- 5.6 Disponibilité & capacité
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.14', 'Gestion de la disponibilité', 'Les services sont disponibles selon les niveaux convenus', 'Mapping : ITIL SMP.01 / COBIT BAI04. Sous-section : Disponibilité & capacité', 14),
('00000000-0000-0000-0005-000000000005', 'GS.15', 'Gestion de la capacité et performance', 'Les ressources sont surveillées et dimensionnées pour les besoins actuels et futurs', 'Mapping : ITIL SMP.03 / ISO A.8.6. Sous-section : Disponibilité & capacité', 15),
('00000000-0000-0000-0005-000000000005', 'GS.16', 'Haute disponibilité et redondance', 'Les systèmes critiques disposent de mécanismes de redondance', 'Mapping : ISO A.8.14. Sous-section : Disponibilité & capacité', 16);

-- 5.7 Continuité & reprise
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.17', 'Plan de continuité d''activité IT (PCA)', 'Un PCA est formalisé pour assurer la continuité des services critiques', 'Mapping : ISO A.5.29 / COBIT DSS04 / ITIL SMP.12. Sous-section : Continuité & reprise', 17),
('00000000-0000-0000-0005-000000000005', 'GS.18', 'Plan de reprise d''activité IT (PRA)', 'Les procédures de reprise des systèmes critiques sont documentées', 'Mapping : ISO A.5.30. Sous-section : Continuité & reprise', 18),
('00000000-0000-0000-0005-000000000005', 'GS.19', 'Tests du PCA/PRA', 'Les plans de continuité et reprise sont testés régulièrement', 'Mapping : ISO A.5.29. Sous-section : Continuité & reprise', 19);

-- 5.8 Développement
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000005', 'GS.20', 'Méthodologie de gestion de projets SI', 'Une méthodologie de gestion de projets est appliquée systématiquement', 'Mapping : COBIT BAI01 / ITIL GMP.08. Sous-section : Développement', 20),
('00000000-0000-0000-0005-000000000005', 'GS.21', 'Cycle de développement sécurisé (SDLC)', 'La sécurité est intégrée dans toutes les phases du cycle de développement', 'Mapping : ISO A.8.25-28 / COBIT BAI03. Sous-section : Développement', 21),
('00000000-0000-0000-0005-000000000005', 'GS.22', 'Séparation des environnements (dev/test/prod)', 'Les environnements de développement, test et production sont isolés', 'Mapping : ISO A.8.31. Sous-section : Développement', 22);

-- ============================================================
-- MS — Management de la Sécurité SI (20 contrôles)
-- ============================================================

-- 6.1 Pratiques & cadre de gestion
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000006', 'MS.01', 'Politique de sécurité SI approuvée et diffusée', 'Une politique de sécurité est formalisée, approuvée par la direction et communiquée', 'Mapping : ISO A.5.1 / ITIL GMP.03. Sous-section : Pratiques & cadre de gestion', 1),
('00000000-0000-0000-0005-000000000006', 'MS.02', 'Organisation de la sécurité de l''information', 'L''organisation de la sécurité est définie avec un RSSI nommé', 'Mapping : ISO A.5.2-4. Sous-section : Pratiques & cadre de gestion', 2),
('00000000-0000-0000-0005-000000000006', 'MS.03', 'Gestion des incidents de sécurité', 'Un processus de détection, escalade et réponse aux incidents de sécurité est en place', 'Mapping : ISO A.5.24-28. Sous-section : Pratiques & cadre de gestion', 3),
('00000000-0000-0000-0005-000000000006', 'MS.04', 'Notification des violations de données', 'Les procédures de notification aux autorités et personnes concernées sont formalisées', 'Mapping : ISO A.5.26 / RGPD Art.33-34. Sous-section : Pratiques & cadre de gestion', 4);

-- 6.2 Parties externes
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000006', 'MS.05', 'Exigences sécurité envers les fournisseurs', 'Des exigences de sécurité sont imposées aux fournisseurs et sous-traitants', 'Mapping : ISO A.5.19-20. Sous-section : Parties externes', 5),
('00000000-0000-0000-0005-000000000006', 'MS.06', 'Sécurité de la chaîne d''approvisionnement', 'Les risques de la supply chain numérique sont identifiés et gérés', 'Mapping : ISO A.5.21-22. Sous-section : Parties externes', 6),
('00000000-0000-0000-0005-000000000006', 'MS.07', 'Sécurité des services cloud', 'Les services cloud utilisés sont évalués et leur sécurité est suivie', 'Mapping : ISO A.5.23. Sous-section : Parties externes', 7);

-- 6.3 Ressources humaines
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000006', 'MS.08', 'Vérification des antécédents à l''embauche', 'Les antécédents des candidats sont vérifiés avant embauche', 'Mapping : ISO A.6.1-2. Sous-section : Ressources humaines', 8),
('00000000-0000-0000-0005-000000000006', 'MS.09', 'Sensibilisation et formation sécurité', 'Un programme de sensibilisation à la sécurité est en place et suivi', 'Mapping : ISO A.6.3. Sous-section : Ressources humaines', 9),
('00000000-0000-0000-0005-000000000006', 'MS.10', 'Processus de départ et mutation', 'Les accès sont révoqués et les actifs restitués au départ ou changement de poste', 'Mapping : ISO A.6.5. Sous-section : Ressources humaines', 10),
('00000000-0000-0000-0005-000000000006', 'MS.11', 'Accords de confidentialité (NDA)', 'Des accords de confidentialité sont signés par les collaborateurs et prestataires', 'Mapping : ISO A.6.6. Sous-section : Ressources humaines', 11),
('00000000-0000-0000-0005-000000000006', 'MS.12', 'Sécurité du télétravail', 'Les règles de sécurité pour le travail à distance sont définies et appliquées', 'Mapping : ISO A.6.7. Sous-section : Ressources humaines', 12);

-- 6.4 Sécurité physique
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000006', 'MS.13', 'Sécurité physique des locaux et zones sensibles', 'Les accès physiques sont contrôlés et les zones sensibles protégées', 'Mapping : ISO A.7.1-4. Sous-section : Sécurité physique', 13),
('00000000-0000-0000-0005-000000000006', 'MS.14', 'Protection environnementale', 'Les dispositifs de protection incendie, électrique et climatique sont en place', 'Mapping : ISO A.7.5-6, A.7.11. Sous-section : Sécurité physique', 14),
('00000000-0000-0000-0005-000000000006', 'MS.15', 'Mise au rebut sécurisée du matériel', 'Les données sont effacées de manière sécurisée avant mise au rebut', 'Mapping : ISO A.7.14. Sous-section : Sécurité physique', 15);

-- 6.5 Gestion des accès
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000006', 'MS.16', 'Politique de contrôle d''accès', 'Les règles de gestion des accès logiques sont formalisées et appliquées', 'Mapping : ISO A.5.15-18. Sous-section : Gestion des accès', 16),
('00000000-0000-0000-0005-000000000006', 'MS.17', 'Gestion des comptes à privilèges', 'Les comptes administrateurs sont inventoriés, surveillés et leur accès est restreint', 'Mapping : ISO A.8.2. Sous-section : Gestion des accès', 17),
('00000000-0000-0000-0005-000000000006', 'MS.18', 'Authentification sécurisée (MFA)', 'L''authentification multi-facteurs est déployée sur les systèmes critiques', 'Mapping : ISO A.8.5. Sous-section : Gestion des accès', 18);

-- 6.6 Sécurité des données & réseaux
insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0005-000000000006', 'MS.19', 'Chiffrement et protection des données', 'Les données sensibles sont chiffrées en transit et au repos', 'Mapping : ISO A.8.24 / A.8.11-12. Sous-section : Données & réseaux', 19),
('00000000-0000-0000-0005-000000000006', 'MS.20', 'Sécurité réseau, segmentation et filtrage', 'Le réseau est segmenté, les accès filtrés et la surveillance active', 'Mapping : ISO A.8.20-23. Sous-section : Données & réseaux', 20);
