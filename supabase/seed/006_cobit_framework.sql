-- Seed: Referentiel COBIT 2019

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000012',
  'COBIT',
  'cobit-2019',
  'Cadre de gouvernance et de management des TI de l''entreprise. Organisé en 5 domaines et 40 objectifs de gouvernance et de management.',
  '2019',
  'ISACA'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Domaines (5 domaines COBIT 2019)
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000012', 'EDM', 'Évaluer, Diriger et Surveiller', 'Gouvernance : s''assurer que les objectifs sont atteints, les risques évalués et les ressources optimisées', 1),
('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000012', 'APO', 'Aligner, Planifier et Organiser', 'Stratégie, architecture, innovation, portefeuille, budget, ressources humaines, relations, fournisseurs, qualité, risques, sécurité', 2),
('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000012', 'BAI', 'Bâtir, Acquérir et Implémenter', 'Programmes, exigences, solutions, disponibilité, changements, actifs, configurations, projets', 3),
('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000012', 'DSS', 'Délivrer, Servir et Supporter', 'Opérations, demandes de service, problèmes, continuité, services de sécurité, contrôles des processus métier', 4),
('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000012', 'MEA', 'Surveiller, Évaluer et Apprécier', 'Performance, système de contrôle interne, conformité aux exigences externes', 5)
on conflict (framework_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - EDM Evaluer, Diriger et Surveiller
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000001', 'EDM01', 'Assurer la définition et la maintenance du cadre de gouvernance', 'Fournir une approche cohérente, intégrée et alignée avec l''approche de gouvernance d''entreprise', 1),
('00000000-0000-0000-0003-000000000001', 'EDM02', 'Assurer la livraison des bénéfices', 'Optimiser la contribution de la valeur métier des processus, services et actifs IT', 2),
('00000000-0000-0000-0003-000000000001', 'EDM03', 'Assurer l''optimisation des risques', 'S''assurer que le risque IT ne dépasse pas l''appétence au risque de l''entreprise', 3),
('00000000-0000-0000-0003-000000000001', 'EDM04', 'Assurer l''optimisation des ressources', 'S''assurer que les ressources IT adéquates et suffisantes sont disponibles', 4),
('00000000-0000-0000-0003-000000000001', 'EDM05', 'Assurer la transparence envers les parties prenantes', 'S''assurer que la mesure et le reporting de performance sont transparents', 5)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - APO Aligner, Planifier et Organiser
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000002', 'APO01', 'Gérer le cadre de management des TI', 'Définir et maintenir les structures organisationnelles et processus de management IT', 1),
('00000000-0000-0000-0003-000000000002', 'APO02', 'Gérer la stratégie', 'Fournir une vision holistique du SI actuel et futur', 2),
('00000000-0000-0000-0003-000000000002', 'APO03', 'Gérer l''architecture d''entreprise', 'Établir une architecture commune pour les processus métier et IT', 3),
('00000000-0000-0000-0003-000000000002', 'APO04', 'Gérer l''innovation', 'Obtenir un avantage concurrentiel par l''innovation technologique', 4),
('00000000-0000-0000-0003-000000000002', 'APO05', 'Gérer le portefeuille', 'Optimiser la performance du portefeuille global de programmes et services', 5),
('00000000-0000-0000-0003-000000000002', 'APO06', 'Gérer le budget et les coûts', 'Gérer les activités financières liées aux TI', 6),
('00000000-0000-0000-0003-000000000002', 'APO07', 'Gérer les ressources humaines', 'Fournir une approche structurée pour assurer une structuration optimale du personnel IT', 7),
('00000000-0000-0000-0003-000000000002', 'APO08', 'Gérer les relations', 'Gérer les relations entre IT et les parties prenantes métier', 8),
('00000000-0000-0000-0003-000000000002', 'APO09', 'Gérer les accords de service', 'Aligner les services IT avec les besoins de l''entreprise', 9),
('00000000-0000-0000-0003-000000000002', 'APO10', 'Gérer les fournisseurs', 'Gérer les services IT fournis par des tiers', 10),
('00000000-0000-0000-0003-000000000002', 'APO11', 'Gérer la qualité', 'Définir et communiquer les exigences de qualité', 11),
('00000000-0000-0000-0003-000000000002', 'APO12', 'Gérer le risque', 'Identifier, évaluer et réduire les risques liés aux TI', 12),
('00000000-0000-0000-0003-000000000002', 'APO13', 'Gérer la sécurité', 'Définir, opérer et surveiller un système de management de la sécurité de l''information', 13),
('00000000-0000-0000-0003-000000000002', 'APO14', 'Gérer les données', 'Obtenir une gestion efficace des actifs de données', 14)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - BAI Batir, Acquerir et Implementer
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000003', 'BAI01', 'Gérer les programmes', 'Gérer les programmes du portefeuille d''investissements', 1),
('00000000-0000-0000-0003-000000000003', 'BAI02', 'Gérer la définition des exigences', 'Identifier les solutions et analyser les exigences avant acquisition ou création', 2),
('00000000-0000-0000-0003-000000000003', 'BAI03', 'Gérer l''identification et la construction des solutions', 'Établir et maintenir des solutions identifiées alignées avec les exigences', 3),
('00000000-0000-0000-0003-000000000003', 'BAI04', 'Gérer la disponibilité et la capacité', 'Équilibrer besoins actuels et futurs en disponibilité, performance et capacité', 4),
('00000000-0000-0000-0003-000000000003', 'BAI05', 'Gérer le changement organisationnel', 'Maximiser la probabilité de succès de l''adoption des changements', 5),
('00000000-0000-0000-0003-000000000003', 'BAI06', 'Gérer les changements IT', 'Gérer tous les changements de manière contrôlée', 6),
('00000000-0000-0000-0003-000000000003', 'BAI07', 'Gérer l''acceptation et la transition des changements IT', 'Accepter formellement et rendre opérationnelles les nouvelles solutions', 7),
('00000000-0000-0000-0003-000000000003', 'BAI08', 'Gérer la connaissance', 'Maintenir la disponibilité des connaissances pertinentes et fiables', 8),
('00000000-0000-0000-0003-000000000003', 'BAI09', 'Gérer les actifs', 'Gérer les actifs IT tout au long de leur cycle de vie', 9),
('00000000-0000-0000-0003-000000000003', 'BAI10', 'Gérer la configuration', 'Définir et maintenir les descriptions et relations des ressources et capacités clés', 10),
('00000000-0000-0000-0003-000000000003', 'BAI11', 'Gérer les projets', 'Gérer les projets du portefeuille d''investissements de manière coordonnée', 11)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - DSS Delivrer, Servir et Supporter
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000004', 'DSS01', 'Gérer les opérations', 'Coordonner et exécuter les activités et procédures opérationnelles', 1),
('00000000-0000-0000-0003-000000000004', 'DSS02', 'Gérer les demandes de service et les incidents', 'Fournir une réponse rapide et efficace aux demandes et incidents', 2),
('00000000-0000-0000-0003-000000000004', 'DSS03', 'Gérer les problèmes', 'Identifier et classer les problèmes et leurs causes racines', 3),
('00000000-0000-0000-0003-000000000004', 'DSS04', 'Gérer la continuité', 'Établir et maintenir un plan de continuité des activités IT', 4),
('00000000-0000-0000-0003-000000000004', 'DSS05', 'Gérer les services de sécurité', 'Protéger les informations de l''entreprise pour maintenir un niveau de risque acceptable', 5),
('00000000-0000-0000-0003-000000000004', 'DSS06', 'Gérer les contrôles des processus métier', 'Définir et maintenir les contrôles de processus métier et sécurité de l''information', 6)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - MEA Surveiller, Evaluer et Apprecier
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000005', 'MEA01', 'Surveiller, évaluer et apprécier la performance et la conformité', 'Collecter, valider et évaluer les objectifs et indicateurs de performance', 1),
('00000000-0000-0000-0003-000000000005', 'MEA02', 'Surveiller, évaluer et apprécier le système de contrôle interne', 'Surveiller en continu l''environnement de contrôle', 2),
('00000000-0000-0000-0003-000000000005', 'MEA03', 'Surveiller, évaluer et apprécier la conformité aux exigences externes', 'Évaluer la conformité aux exigences réglementaires, contractuelles et légales', 3),
('00000000-0000-0000-0003-000000000005', 'MEA04', 'Surveiller, évaluer et apprécier l''assurance', 'Obtenir l''assurance que les contrôles clés fonctionnent efficacement', 4)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Correspondances ISO 27001 <-> COBIT 2019
-- ============================================================

-- A.5.1 Politiques de securite <-> APO13 Gerer la securite
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'equivalent', 'Politique de securite et SMSI'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'APO13'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.1'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.2 Roles <-> APO01 Cadre de management
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'partial', 'Roles securite dans le cadre de management IT'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'APO01'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.2'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.9 Inventaire des actifs <-> BAI09 Gerer les actifs
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'equivalent', 'Gestion des actifs informationnels et IT'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'BAI09'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.9'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.19 Fournisseurs <-> APO10 Gerer les fournisseurs
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'equivalent', 'Gestion des relations et risques fournisseurs'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'APO10'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.19'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.24 Gestion des incidents <-> DSS02 Demandes et incidents
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'partial', 'ISO se concentre sur les incidents securite, COBIT couvre aussi les demandes de service'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'DSS02'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.24'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.29 Continuite <-> DSS04 Gerer la continuite
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'equivalent', 'Plans de continuite d''activite IT'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'DSS04'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.29'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.31 Exigences legales <-> MEA03 Conformite exigences externes
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'equivalent', 'Conformite reglementaire et legale'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'MEA03'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.31'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.35 Revue independante <-> MEA02 Systeme de controle interne
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'related', 'Audit et revue du systeme de controle'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'MEA02'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.35'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.8.9 Gestion de la configuration <-> BAI10 Gerer la configuration
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'equivalent', 'Gestion des configurations systeme'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'BAI10'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.8.9'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.8.32 Gestion des changements <-> BAI06 Gerer les changements IT
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'equivalent', 'Processus de gestion des changements'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'BAI06'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.8.32'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.6.3 Sensibilisation <-> APO07 Ressources humaines
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'partial', 'Formation securite dans la gestion RH IT'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'APO07'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.6.3'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';

-- A.5.12 Classification <-> APO14 Gerer les donnees
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, cobit.id, 'partial', 'Classification des informations dans la gestion des donnees'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls cobit on cobit.code = 'APO14'
join public.domains cobit_d on cobit_d.id = cobit.domain_id
where iso.code = 'A.5.12'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and cobit_d.framework_id = '00000000-0000-0000-0000-000000000012';
