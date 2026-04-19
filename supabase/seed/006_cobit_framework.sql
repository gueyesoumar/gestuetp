-- Seed: Referentiel COBIT 2019

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000012',
  'COBIT',
  'cobit-2019',
  'Cadre de gouvernance et de management des TI de l''entreprise. Organise en 5 domaines et 40 objectifs de gouvernance et de management.',
  '2019',
  'ISACA'
);

-- ============================================================
-- Domaines (5 domaines COBIT 2019)
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000012', 'EDM', 'Evaluer, Diriger et Surveiller', 'Gouvernance : s''assurer que les objectifs sont atteints, les risques evalues et les ressources optimisees', 1),
('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000012', 'APO', 'Aligner, Planifier et Organiser', 'Strategie, architecture, innovation, portefeuille, budget, ressources humaines, relations, fournisseurs, qualite, risques, securite', 2),
('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000012', 'BAI', 'Batir, Acquerir et Implementer', 'Programmes, exigences, solutions, disponibilite, changements, actifs, configurations, projets', 3),
('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000012', 'DSS', 'Delivrer, Servir et Supporter', 'Operations, demandes de service, problemes, continuite, services de securite, controles des processus metier', 4),
('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000012', 'MEA', 'Surveiller, Evaluer et Apprecier', 'Performance, systeme de controle interne, conformite aux exigences externes', 5);

-- ============================================================
-- Controles — EDM Evaluer, Diriger et Surveiller
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000001', 'EDM01', 'Assurer la definition et la maintenance du cadre de gouvernance', 'Fournir une approche coherente, integree et alignee avec l''approche de gouvernance d''entreprise', 1),
('00000000-0000-0000-0003-000000000001', 'EDM02', 'Assurer la livraison des benefices', 'Optimiser la contribution de la valeur metier des processus, services et actifs IT', 2),
('00000000-0000-0000-0003-000000000001', 'EDM03', 'Assurer l''optimisation des risques', 'S''assurer que le risque IT ne depasse pas l''appetence au risque de l''entreprise', 3),
('00000000-0000-0000-0003-000000000001', 'EDM04', 'Assurer l''optimisation des ressources', 'S''assurer que les ressources IT adequates et suffisantes sont disponibles', 4),
('00000000-0000-0000-0003-000000000001', 'EDM05', 'Assurer la transparence envers les parties prenantes', 'S''assurer que la mesure et le reporting de performance sont transparents', 5);

-- ============================================================
-- Controles — APO Aligner, Planifier et Organiser
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000002', 'APO01', 'Gerer le cadre de management des TI', 'Definir et maintenir les structures organisationnelles et processus de management IT', 1),
('00000000-0000-0000-0003-000000000002', 'APO02', 'Gerer la strategie', 'Fournir une vision holistique du SI actuel et futur', 2),
('00000000-0000-0000-0003-000000000002', 'APO03', 'Gerer l''architecture d''entreprise', 'Etablir une architecture commune pour les processus metier et IT', 3),
('00000000-0000-0000-0003-000000000002', 'APO04', 'Gerer l''innovation', 'Obtenir un avantage concurrentiel par l''innovation technologique', 4),
('00000000-0000-0000-0003-000000000002', 'APO05', 'Gerer le portefeuille', 'Optimiser la performance du portefeuille global de programmes et services', 5),
('00000000-0000-0000-0003-000000000002', 'APO06', 'Gerer le budget et les couts', 'Gerer les activites financieres liees aux TI', 6),
('00000000-0000-0000-0003-000000000002', 'APO07', 'Gerer les ressources humaines', 'Fournir une approche structuree pour assurer une structuration optimale du personnel IT', 7),
('00000000-0000-0000-0003-000000000002', 'APO08', 'Gerer les relations', 'Gerer les relations entre IT et les parties prenantes metier', 8),
('00000000-0000-0000-0003-000000000002', 'APO09', 'Gerer les accords de service', 'Aligner les services IT avec les besoins de l''entreprise', 9),
('00000000-0000-0000-0003-000000000002', 'APO10', 'Gerer les fournisseurs', 'Gerer les services IT fournis par des tiers', 10),
('00000000-0000-0000-0003-000000000002', 'APO11', 'Gerer la qualite', 'Definir et communiquer les exigences de qualite', 11),
('00000000-0000-0000-0003-000000000002', 'APO12', 'Gerer le risque', 'Identifier, evaluer et reduire les risques lies aux TI', 12),
('00000000-0000-0000-0003-000000000002', 'APO13', 'Gerer la securite', 'Definir, operer et surveiller un systeme de management de la securite de l''information', 13),
('00000000-0000-0000-0003-000000000002', 'APO14', 'Gerer les donnees', 'Obtenir une gestion efficace des actifs de donnees', 14);

-- ============================================================
-- Controles — BAI Batir, Acquerir et Implementer
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000003', 'BAI01', 'Gerer les programmes', 'Gerer les programmes du portefeuille d''investissements', 1),
('00000000-0000-0000-0003-000000000003', 'BAI02', 'Gerer la definition des exigences', 'Identifier les solutions et analyser les exigences avant acquisition ou creation', 2),
('00000000-0000-0000-0003-000000000003', 'BAI03', 'Gerer l''identification et la construction des solutions', 'Etablir et maintenir des solutions identifiees alignees avec les exigences', 3),
('00000000-0000-0000-0003-000000000003', 'BAI04', 'Gerer la disponibilite et la capacite', 'Equilibrer besoins actuels et futurs en disponibilite, performance et capacite', 4),
('00000000-0000-0000-0003-000000000003', 'BAI05', 'Gerer le changement organisationnel', 'Maximiser la probabilite de succes de l''adoption des changements', 5),
('00000000-0000-0000-0003-000000000003', 'BAI06', 'Gerer les changements IT', 'Gerer tous les changements de maniere controlee', 6),
('00000000-0000-0000-0003-000000000003', 'BAI07', 'Gerer l''acceptation et la transition des changements IT', 'Accepter formellement et rendre operationnelles les nouvelles solutions', 7),
('00000000-0000-0000-0003-000000000003', 'BAI08', 'Gerer la connaissance', 'Maintenir la disponibilite des connaissances pertinentes et fiables', 8),
('00000000-0000-0000-0003-000000000003', 'BAI09', 'Gerer les actifs', 'Gerer les actifs IT tout au long de leur cycle de vie', 9),
('00000000-0000-0000-0003-000000000003', 'BAI10', 'Gerer la configuration', 'Definir et maintenir les descriptions et relations des ressources et capacites cles', 10),
('00000000-0000-0000-0003-000000000003', 'BAI11', 'Gerer les projets', 'Gerer les projets du portefeuille d''investissements de maniere coordonnee', 11);

-- ============================================================
-- Controles — DSS Delivrer, Servir et Supporter
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000004', 'DSS01', 'Gerer les operations', 'Coordonner et executer les activites et procedures operationnelles', 1),
('00000000-0000-0000-0003-000000000004', 'DSS02', 'Gerer les demandes de service et les incidents', 'Fournir une reponse rapide et efficace aux demandes et incidents', 2),
('00000000-0000-0000-0003-000000000004', 'DSS03', 'Gerer les problemes', 'Identifier et classer les problemes et leurs causes racines', 3),
('00000000-0000-0000-0003-000000000004', 'DSS04', 'Gerer la continuite', 'Etablir et maintenir un plan de continuite des activites IT', 4),
('00000000-0000-0000-0003-000000000004', 'DSS05', 'Gerer les services de securite', 'Proteger les informations de l''entreprise pour maintenir un niveau de risque acceptable', 5),
('00000000-0000-0000-0003-000000000004', 'DSS06', 'Gerer les controles des processus metier', 'Definir et maintenir les controles de processus metier et securite de l''information', 6);

-- ============================================================
-- Controles — MEA Surveiller, Evaluer et Apprecier
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0003-000000000005', 'MEA01', 'Surveiller, evaluer et apprecier la performance et la conformite', 'Collecter, valider et evaluer les objectifs et indicateurs de performance', 1),
('00000000-0000-0000-0003-000000000005', 'MEA02', 'Surveiller, evaluer et apprecier le systeme de controle interne', 'Surveiller en continu l''environnement de controle', 2),
('00000000-0000-0000-0003-000000000005', 'MEA03', 'Surveiller, evaluer et apprecier la conformite aux exigences externes', 'Evaluer la conformite aux exigences reglementaires, contractuelles et legales', 3),
('00000000-0000-0000-0003-000000000005', 'MEA04', 'Surveiller, evaluer et apprecier l''assurance', 'Obtenir l''assurance que les controles cles fonctionnent efficacement', 4);

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
