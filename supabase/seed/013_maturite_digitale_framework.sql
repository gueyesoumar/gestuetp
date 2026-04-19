-- Seed: Référentiel Maturité Digitale — 6 domaines, 46 contrôles
-- Évaluation du niveau de maturité numérique d'une organisation

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000016',
  'Maturité Digitale',
  'maturite-digitale',
  'Référentiel d''évaluation de la maturité numérique. Couvre la stratégie digitale, l''expérience client, les processus, les données, le capital humain et l''écosystème d''innovation.',
  '1.0',
  'Gëstu'
);

-- ============================================================
-- Domaines
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-000000000016', 'SV', 'Stratégie & Vision digitale', 'Leadership, vision, feuille de route, gouvernance et culture d''innovation', 1),
('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0000-000000000016', 'EX', 'Expérience client & digitale', 'Parcours client, canaux digitaux, personnalisation, satisfaction et accessibilité', 2),
('00000000-0000-0000-0007-000000000003', '00000000-0000-0000-0000-000000000016', 'PO', 'Processus & Opérations', 'Automatisation, dématérialisation, workflows, collaboration et efficacité opérationnelle', 3),
('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0000-000000000016', 'DT', 'Données & Technologies', 'Stratégie data, analytics, IA, modernité du SI, API et cybersécurité', 4),
('00000000-0000-0000-0007-000000000005', '00000000-0000-0000-0000-000000000016', 'CH', 'Capital humain & Culture', 'Compétences digitales, formation, culture d''innovation et conduite du changement', 5),
('00000000-0000-0000-0007-000000000006', '00000000-0000-0000-0000-000000000016', 'EC', 'Écosystème & Innovation', 'Partenariats, open innovation, veille, expérimentations et agilité organisationnelle', 6);

-- ============================================================
-- SV — Stratégie & Vision digitale (8 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0007-000000000001', 'SV.01', 'Vision digitale formalisée et portée par la direction', 'Une vision claire de la transformation digitale est définie et portée au plus haut niveau', 'Évaluer : La direction a-t-elle une vision digitale claire ? Est-elle communiquée ?', 1),
('00000000-0000-0000-0007-000000000001', 'SV.02', 'Feuille de route de transformation digitale', 'Une feuille de route avec des jalons, des priorités et des responsables est formalisée', 'Évaluer : Existe-t-il un plan concret avec des étapes et des dates ?', 2),
('00000000-0000-0000-0007-000000000001', 'SV.03', 'Budget dédié à la transformation digitale', 'Un budget spécifique est alloué à la transformation digitale, distinct du budget IT courant', 'Évaluer : La transformation est-elle financée ou reste-t-elle un vœu pieux ?', 3),
('00000000-0000-0000-0007-000000000001', 'SV.04', 'Gouvernance de la transformation (comité, sponsor)', 'Un comité de pilotage et un sponsor exécutif sont en place pour piloter la transformation', 'Évaluer : Qui pilote la transformation ? Y a-t-il un sponsorship au COMEX ?', 4),
('00000000-0000-0000-0007-000000000001', 'SV.05', 'KPIs de maturité digitale définis et suivis', 'Des indicateurs de performance digitale sont définis, mesurés et revus régulièrement', 'Évaluer : Comment l''organisation mesure-t-elle sa progression digitale ?', 5),
('00000000-0000-0000-0007-000000000001', 'SV.06', 'Alignement stratégie digitale / stratégie métier', 'La stratégie digitale est alignée et contribue directement aux objectifs métier', 'Évaluer : Le digital est-il au service du métier ou déconnecté ?', 6),
('00000000-0000-0000-0007-000000000001', 'SV.07', 'Veille concurrentielle et sectorielle sur le digital', 'Une veille sur les pratiques digitales des concurrents et du secteur est en place', 'Évaluer : L''organisation sait-elle où elle se situe par rapport à son marché ?', 7),
('00000000-0000-0000-0007-000000000001', 'SV.08', 'Communication interne sur la vision digitale', 'La vision digitale est communiquée régulièrement aux collaborateurs', 'Évaluer : Les équipes comprennent-elles et adhèrent-elles à la vision ?', 8);

-- ============================================================
-- EX — Expérience client & digitale (8 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0007-000000000002', 'EX.01', 'Cartographie des parcours clients digitaux', 'Les parcours clients sont cartographiés et les points de friction identifiés', 'Évaluer : Les parcours clients sont-ils connus et optimisés ?', 1),
('00000000-0000-0000-0007-000000000002', 'EX.02', 'Présence et maturité des canaux digitaux', 'Les canaux digitaux (site web, app mobile, API, chatbot) sont développés et maintenus', 'Évaluer : L''offre digitale est-elle complète et moderne ?', 2),
('00000000-0000-0000-0007-000000000002', 'EX.03', 'Expérience utilisateur (UX) mesurée et optimisée', 'L''UX est mesurée (tests utilisateurs, analytics) et fait l''objet d''améliorations continues', 'Évaluer : L''UX est-elle une priorité ? Est-elle mesurée ?', 3),
('00000000-0000-0000-0007-000000000002', 'EX.04', 'Personnalisation de l''expérience client', 'L''expérience client est personnalisée en fonction du profil, du comportement et des préférences', 'Évaluer : Le client a-t-il une expérience sur mesure ou générique ?', 4),
('00000000-0000-0000-0007-000000000002', 'EX.05', 'Omnicanalité et cohérence entre les canaux', 'L''expérience est cohérente et fluide entre les différents canaux (web, mobile, physique)', 'Évaluer : Le client peut-il passer d''un canal à l''autre sans friction ?', 5),
('00000000-0000-0000-0007-000000000002', 'EX.06', 'Mesure de la satisfaction client digitale', 'La satisfaction client sur les canaux digitaux est mesurée (NPS, CSAT, CES)', 'Évaluer : L''organisation connaît-elle le niveau de satisfaction de ses clients digitaux ?', 6),
('00000000-0000-0000-0007-000000000002', 'EX.07', 'Self-service et autonomie du client', 'Le client peut réaliser les principales opérations en autonomie via les canaux digitaux', 'Évaluer : Quelle part des interactions peut être réalisée sans intervention humaine ?', 7),
('00000000-0000-0000-0007-000000000002', 'EX.08', 'Accessibilité numérique', 'Les services digitaux sont accessibles aux personnes en situation de handicap (RGAA, WCAG)', 'Évaluer : L''accessibilité numérique est-elle prise en compte ?', 8);

-- ============================================================
-- PO — Processus & Opérations (8 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0007-000000000003', 'PO.01', 'Cartographie et digitalisation des processus métier', 'Les processus métier sont cartographiés et les priorités de digitalisation identifiées', 'Évaluer : Quels processus sont digitalisés ? Lesquels restent manuels ?', 1),
('00000000-0000-0000-0007-000000000003', 'PO.02', 'Niveau d''automatisation des processus', 'Les processus répétitifs sont automatisés (RPA, workflows, règles métier)', 'Évaluer : L''organisation exploite-t-elle l''automatisation pour gagner en efficacité ?', 2),
('00000000-0000-0000-0007-000000000003', 'PO.03', 'Dématérialisation des documents et signatures', 'Les documents et signatures sont dématérialisés dans les processus clés', 'Évaluer : Le papier est-il encore omniprésent ou la dématérialisation est-elle avancée ?', 3),
('00000000-0000-0000-0007-000000000003', 'PO.04', 'Collaboration digitale', 'Des outils de collaboration digitale sont déployés et adoptés (messagerie, visio, espaces partagés)', 'Évaluer : Les équipes collaborent-elles efficacement grâce aux outils digitaux ?', 4),
('00000000-0000-0000-0007-000000000003', 'PO.05', 'Intégration des systèmes', 'Les systèmes d''information sont intégrés via des API ou des middlewares (pas de ressaisie manuelle)', 'Évaluer : Les systèmes communiquent-ils entre eux ou fonctionnent-ils en silos ?', 5),
('00000000-0000-0000-0007-000000000003', 'PO.06', 'Gestion électronique des documents (GED)', 'Un système de GED est en place pour centraliser et organiser les documents', 'Évaluer : Les documents sont-ils retrouvables facilement et de manière fiable ?', 6),
('00000000-0000-0000-0007-000000000003', 'PO.07', 'Mesure de l''efficacité opérationnelle digitale', 'L''impact de la digitalisation sur l''efficacité opérationnelle est mesuré', 'Évaluer : Sait-on chiffrer les gains apportés par la digitalisation ?', 7),
('00000000-0000-0000-0007-000000000003', 'PO.08', 'Méthodologies agiles dans les opérations', 'Les méthodologies agiles sont adoptées au-delà de l''IT (métier, RH, finance)', 'Évaluer : L''agilité dépasse-t-elle le cadre de la DSI ?', 8);

-- ============================================================
-- DT — Données & Technologies (9 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0007-000000000004', 'DT.01', 'Stratégie data formalisée', 'Une stratégie de gestion et d''exploitation des données est formalisée', 'Évaluer : L''organisation a-t-elle une vision claire de l''exploitation de ses données ?', 1),
('00000000-0000-0000-0007-000000000004', 'DT.02', 'Qualité et gouvernance des données', 'La qualité des données est mesurée et des processus de gouvernance sont en place', 'Évaluer : Les données sont-elles fiables, à jour et gouvernées ?', 2),
('00000000-0000-0000-0007-000000000004', 'DT.03', 'Exploitation des données (analytics, BI, reporting)', 'Les données sont exploitées via des outils d''analytics, de BI et de reporting', 'Évaluer : Les décisions sont-elles data-driven ou basées sur l''intuition ?', 3),
('00000000-0000-0000-0007-000000000004', 'DT.04', 'Usage de l''intelligence artificielle et du machine learning', 'L''IA et le ML sont utilisés ou en expérimentation pour des cas d''usage concrets', 'Évaluer : L''organisation explore-t-elle l''IA ou est-elle en retard ?', 4),
('00000000-0000-0000-0007-000000000004', 'DT.05', 'Modernité de l''infrastructure', 'L''infrastructure est moderne (cloud, conteneurs, serverless) et évolutive', 'Évaluer : L''infrastructure est-elle un accélérateur ou un frein à la transformation ?', 5),
('00000000-0000-0000-0007-000000000004', 'DT.06', 'Maturité des API', 'Les API sont documentées, sécurisées et utilisées pour l''intégration et l''ouverture', 'Évaluer : L''organisation est-elle API-first ou monolithique ?', 6),
('00000000-0000-0000-0007-000000000004', 'DT.07', 'Cybersécurité et protection des données', 'La cybersécurité est intégrée dans la stratégie digitale et les données sont protégées', 'Évaluer : La sécurité est-elle un enabler ou un afterthought de la transformation ?', 7),
('00000000-0000-0000-0007-000000000004', 'DT.08', 'Capacité d''intégration de nouvelles technologies', 'L''organisation est capable d''évaluer et d''intégrer rapidement de nouvelles technologies', 'Évaluer : L''organisation est-elle agile technologiquement ou figée ?', 8),
('00000000-0000-0000-0007-000000000004', 'DT.09', 'Dette technique et obsolescence du SI', 'La dette technique et l''obsolescence sont identifiées et un plan de modernisation existe', 'Évaluer : Le SI est-il un atout ou un boulet pour la transformation ?', 9);

-- ============================================================
-- CH — Capital humain & Culture (7 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0007-000000000005', 'CH.01', 'Compétences digitales des équipes évaluées', 'Le niveau de compétences digitales des collaborateurs est évalué régulièrement', 'Évaluer : L''organisation connaît-elle le niveau digital de ses équipes ?', 1),
('00000000-0000-0000-0007-000000000005', 'CH.02', 'Plan de formation et montée en compétences digitales', 'Un plan de formation au digital est en place et suivi (upskilling, reskilling)', 'Évaluer : Les équipes sont-elles formées au digital ou livrées à elles-mêmes ?', 2),
('00000000-0000-0000-0007-000000000005', 'CH.03', 'Culture d''innovation et droit à l''erreur', 'La culture d''entreprise encourage l''innovation, l''expérimentation et tolère l''échec', 'Évaluer : Les collaborateurs osent-ils innover ou craignent-ils l''erreur ?', 3),
('00000000-0000-0000-0007-000000000005', 'CH.04', 'Digital workplace', 'Les outils de travail sont modernes, mobiles et adaptés aux usages actuels', 'Évaluer : Les collaborateurs ont-ils les outils nécessaires pour travailler efficacement ?', 4),
('00000000-0000-0000-0007-000000000005', 'CH.05', 'Attractivité et rétention des talents digitaux', 'L''organisation est attractive pour les profils digitaux et parvient à les retenir', 'Évaluer : L''entreprise attire-t-elle et garde-t-elle les talents tech/digital ?', 5),
('00000000-0000-0000-0007-000000000005', 'CH.06', 'Conduite du changement structurée', 'Les projets de transformation incluent une démarche de conduite du changement', 'Évaluer : Le changement est-il accompagné ou imposé ?', 6),
('00000000-0000-0000-0007-000000000005', 'CH.07', 'Champions digitaux et ambassadeurs identifiés', 'Des relais internes (champions digitaux) sont identifiés pour porter la transformation', 'Évaluer : Y a-t-il des ambassadeurs du digital dans les équipes métier ?', 7);

-- ============================================================
-- EC — Écosystème & Innovation (6 contrôles)
-- ============================================================

insert into public.controls (domain_id, code, name, description, guidance, sort_order) values
('00000000-0000-0000-0007-000000000006', 'EC.01', 'Partenariats avec l''écosystème tech', 'Des partenariats avec des startups, incubateurs ou acteurs tech sont en place', 'Évaluer : L''organisation s''ouvre-t-elle à l''écosystème ou reste-t-elle fermée ?', 1),
('00000000-0000-0000-0007-000000000006', 'EC.02', 'Démarche d''open innovation', 'Une démarche d''innovation ouverte est en place (hackathons, appels à projets, co-création)', 'Évaluer : L''innovation vient-elle aussi de l''extérieur ?', 2),
('00000000-0000-0000-0007-000000000006', 'EC.03', 'Veille technologique et benchmarking', 'Une veille technologique structurée et un benchmarking régulier sont réalisés', 'Évaluer : L''organisation surveille-t-elle les tendances et les concurrents ?', 3),
('00000000-0000-0000-0007-000000000006', 'EC.04', 'Expérimentations et pilotes (POC, MVP)', 'Des expérimentations sont menées régulièrement (POC, MVP) avant industrialisation', 'Évaluer : L''organisation teste-t-elle avant de déployer ou passe-t-elle directement au grand projet ?', 4),
('00000000-0000-0000-0007-000000000006', 'EC.05', 'Capacité à scaler les innovations réussies', 'Les pilotes réussis sont industrialisés et déployés à grande échelle', 'Évaluer : Les POC restent-ils des POC ou deviennent-ils des produits ?', 5),
('00000000-0000-0000-0007-000000000006', 'EC.06', 'Contribution à l''écosystème', 'L''organisation contribue à l''écosystème (API ouvertes, communauté, open source, partage)', 'Évaluer : L''organisation est-elle un acteur de l''écosystème ou un simple consommateur ?', 6);
