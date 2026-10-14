-- Seed: Referentiel ITIL 4

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000013',
  'ITIL',
  'itil-v4',
  'Cadre de bonnes pratiques pour la gestion des services IT. Organisé en 34 pratiques réparties en 3 catégories.',
  '4',
  'Axelos / PeopleCert'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Domaines (3 categories de pratiques ITIL 4)
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000013', 'GMP', 'Pratiques générales de management', 'Pratiques adoptées et adaptées pour la gestion des services', 1),
('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000013', 'SMP', 'Pratiques de management des services', 'Pratiques spécifiques à la gestion et livraison des services IT', 2),
('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000013', 'TMP', 'Pratiques de management technique', 'Pratiques techniques pour le déploiement et la gestion de l''infrastructure', 3)
on conflict (framework_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - GMP Pratiques generales de management
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0004-000000000001', 'GMP.01', 'Gestion de l''architecture', 'Comprendre les éléments de l''organisation et leurs interrelations', 1),
('00000000-0000-0000-0004-000000000001', 'GMP.02', 'Amélioration continue', 'Aligner les pratiques et services avec les besoins changeants', 2),
('00000000-0000-0000-0004-000000000001', 'GMP.03', 'Gestion de la sécurité de l''information', 'Protéger l''information nécessaire à l''organisation', 3),
('00000000-0000-0000-0004-000000000001', 'GMP.04', 'Gestion des connaissances', 'Maintenir et améliorer l''utilisation efficace de l''information et des connaissances', 4),
('00000000-0000-0000-0004-000000000001', 'GMP.05', 'Mesure et reporting', 'Soutenir la prise de décision et l''amélioration continue', 5),
('00000000-0000-0000-0004-000000000001', 'GMP.06', 'Gestion du changement organisationnel', 'S''assurer que les changements sont mis en œuvre avec succès', 6),
('00000000-0000-0000-0004-000000000001', 'GMP.07', 'Gestion du portefeuille', 'S''assurer que l''organisation dispose du bon mix de programmes, projets et services', 7),
('00000000-0000-0000-0004-000000000001', 'GMP.08', 'Gestion de projet', 'S''assurer que tous les projets sont livrés avec succès', 8),
('00000000-0000-0000-0004-000000000001', 'GMP.09', 'Gestion des relations', 'Établir et entretenir les liens entre l''organisation et ses parties prenantes', 9),
('00000000-0000-0000-0004-000000000001', 'GMP.10', 'Gestion des risques', 'Comprendre et gérer les risques de manière efficace', 10),
('00000000-0000-0000-0004-000000000001', 'GMP.11', 'Gestion financière des services', 'Soutenir les stratégies et plans de gestion des services', 11),
('00000000-0000-0000-0004-000000000001', 'GMP.12', 'Gestion de la stratégie', 'Définir la direction de l''organisation et l''allocation des ressources', 12),
('00000000-0000-0000-0004-000000000001', 'GMP.13', 'Gestion des fournisseurs', 'S''assurer que les fournisseurs et leurs performances sont gérés de manière appropriée', 13),
('00000000-0000-0000-0004-000000000001', 'GMP.14', 'Gestion du personnel et des talents', 'S''assurer que l''organisation dispose des bonnes personnes avec les bonnes compétences', 14)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - SMP Pratiques de management des services
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0004-000000000002', 'SMP.01', 'Gestion de la disponibilité', 'S''assurer que les services sont disponibles selon les niveaux convenus', 1),
('00000000-0000-0000-0004-000000000002', 'SMP.02', 'Analyse métier', 'Analyser les besoins métier et recommander des solutions', 2),
('00000000-0000-0000-0004-000000000002', 'SMP.03', 'Gestion de la capacité et de la performance', 'S''assurer que les services atteignent les niveaux de performance convenus', 3),
('00000000-0000-0000-0004-000000000002', 'SMP.04', 'Habilitation des changements', 'Maximiser le nombre de changements réussis par une évaluation appropriée', 4),
('00000000-0000-0000-0004-000000000002', 'SMP.05', 'Gestion des incidents', 'Minimiser l''impact négatif des incidents en restaurant le service normal', 5),
('00000000-0000-0000-0004-000000000002', 'SMP.06', 'Gestion des actifs IT', 'Planifier et gérer le cycle de vie complet des actifs IT', 6),
('00000000-0000-0000-0004-000000000002', 'SMP.07', 'Surveillance et gestion des événements', 'Observer les services et enregistrer les événements', 7),
('00000000-0000-0000-0004-000000000002', 'SMP.08', 'Gestion des problèmes', 'Réduire la probabilité et l''impact des incidents en identifiant les causes', 8),
('00000000-0000-0000-0004-000000000002', 'SMP.09', 'Gestion des mises en production', 'Rendre les services et fonctionnalités nouveaux ou modifiés disponibles', 9),
('00000000-0000-0000-0004-000000000002', 'SMP.10', 'Gestion du catalogue de services', 'Fournir une source unique d''information cohérente sur les services', 10),
('00000000-0000-0000-0004-000000000002', 'SMP.11', 'Gestion de la configuration des services', 'S''assurer que l''information sur la configuration est disponible et fiable', 11),
('00000000-0000-0000-0004-000000000002', 'SMP.12', 'Gestion de la continuité des services', 'S''assurer que la disponibilité et la performance sont maintenues à un niveau suffisant en cas de sinistre', 12),
('00000000-0000-0000-0004-000000000002', 'SMP.13', 'Conception des services', 'Concevoir des produits et services adaptés et utilisables', 13),
('00000000-0000-0000-0004-000000000002', 'SMP.14', 'Centre de services (Service Desk)', 'Capturer la demande de résolution d''incidents et de demandes de service', 14),
('00000000-0000-0000-0004-000000000002', 'SMP.15', 'Gestion des niveaux de service', 'Définir des objectifs de niveaux de service clairs et mesurables', 15),
('00000000-0000-0000-0004-000000000002', 'SMP.16', 'Gestion des demandes de service', 'Soutenir la qualité de service convenue en traitant les demandes', 16),
('00000000-0000-0000-0004-000000000002', 'SMP.17', 'Validation et test des services', 'S''assurer que les services répondent aux exigences définies', 17)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Controles - TMP Pratiques de management technique
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0004-000000000003', 'TMP.01', 'Gestion des déploiements', 'Déployer le matériel, les logiciels et la documentation nouveaux ou modifiés', 1),
('00000000-0000-0000-0004-000000000003', 'TMP.02', 'Gestion de l''infrastructure et des plateformes', 'Superviser l''infrastructure et les plateformes technologiques', 2),
('00000000-0000-0000-0004-000000000003', 'TMP.03', 'Développement et gestion des logiciels', 'S''assurer que les applications répondent aux besoins des parties prenantes', 3)
on conflict (domain_id, code) do update set
  name = excluded.name,
  description = excluded.description;

-- ============================================================
-- Correspondances ISO 27001 <-> ITIL 4
-- ============================================================

-- A.5.1 Politiques <-> GMP.03 Securite de l'information
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'equivalent', 'Politique et gestion de la securite de l''information'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'GMP.03'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.5.1'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.5.9 Inventaire des actifs <-> SMP.06 Actifs IT
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'equivalent', 'Gestion du cycle de vie des actifs'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'SMP.06'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.5.9'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.5.19 Fournisseurs <-> GMP.13 Gestion des fournisseurs
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'equivalent', 'Gestion des fournisseurs et des tiers'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'GMP.13'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.5.19'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.5.24 Incidents <-> SMP.05 Gestion des incidents
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'partial', 'ITIL couvre les incidents IT en general, ISO se concentre sur la securite'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'SMP.05'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.5.24'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.5.29 Continuite <-> SMP.12 Continuite des services
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'equivalent', 'Continuite des services IT'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'SMP.12'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.5.29'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.8.9 Configuration <-> SMP.11 Configuration des services
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'equivalent', 'Gestion de la configuration'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'SMP.11'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.8.9'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.8.32 Gestion des changements <-> SMP.04 Habilitation des changements
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'equivalent', 'Processus de gestion et habilitation des changements'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'SMP.04'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.8.32'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.8.15 Journalisation <-> SMP.07 Surveillance et evenements
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'partial', 'ITIL couvre la surveillance IT en general, ISO se concentre sur les logs securite'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'SMP.07'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.8.15'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.5.27 Tirer enseignements <-> GMP.02 Amelioration continue
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'related', 'Retour d''experience et amelioration continue'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'GMP.02'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.5.27'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';

-- A.6.3 Sensibilisation <-> GMP.14 Personnel et talents
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, itil.id, 'partial', 'Formation securite dans la gestion des talents'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls itil on itil.code = 'GMP.14'
join public.domains itil_d on itil_d.id = itil.domain_id
where iso.code = 'A.6.3'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and itil_d.framework_id = '00000000-0000-0000-0000-000000000013';
