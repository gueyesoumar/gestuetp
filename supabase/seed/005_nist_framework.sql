-- Seed: Référentiel NIST Cybersecurity Framework 2.0

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000011',
  'NIST Cybersecurity Framework',
  'nist-csf',
  'Cadre de cybersécurité du NIST. Organisé en 6 fonctions : Gouverner, Identifier, Protéger, Détecter, Répondre, Rétablir.',
  '2.0',
  'NIST'
);

-- ============================================================
-- Domaines (6 fonctions NIST CSF 2.0)
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000011', 'GV', 'Gouverner (Govern)', 'Stratégie de gestion des risques cyber, attentes et politiques', 1),
('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000011', 'ID', 'Identifier (Identify)', 'Compréhension du contexte, des actifs, des risques', 2),
('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000011', 'PR', 'Protéger (Protect)', 'Mesures de protection pour limiter l''impact des menaces', 3),
('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000011', 'DE', 'Détecter (Detect)', 'Détection rapide des événements de cybersécurité', 4),
('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000011', 'RS', 'Répondre (Respond)', 'Actions face à un incident de cybersécurité détecté', 5),
('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-000000000011', 'RC', 'Rétablir (Recover)', 'Restauration des capacités et services après un incident', 6);

-- ============================================================
-- Contrôles — GV Gouverner
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000001', 'GV.OC', 'Contexte organisationnel', 'Compréhension du contexte de l''organisation pour la gestion des risques cyber', 1),
('00000000-0000-0000-0002-000000000001', 'GV.RM', 'Stratégie de gestion des risques', 'Priorités, contraintes, tolérance au risque, appétence', 2),
('00000000-0000-0000-0002-000000000001', 'GV.RR', 'Rôles, responsabilités et autorités', 'Rôles et responsabilités en cybersécurité établis et communiqués', 3),
('00000000-0000-0000-0002-000000000001', 'GV.PO', 'Politiques', 'Politiques de cybersécurité établies, communiquées et appliquées', 4),
('00000000-0000-0000-0002-000000000001', 'GV.OV', 'Supervision', 'Supervision de la stratégie de cybersécurité', 5),
('00000000-0000-0000-0002-000000000001', 'GV.SC', 'Gestion de la chaîne d''approvisionnement cyber', 'Risques de la supply chain identifiés et gérés', 6);

-- ============================================================
-- Contrôles — ID Identifier
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000002', 'ID.AM', 'Gestion des actifs', 'Inventaire des actifs (matériels, logiciels, données, systèmes)', 1),
('00000000-0000-0000-0002-000000000002', 'ID.RA', 'Évaluation des risques', 'Risques identifiés, analysés et priorisés', 2),
('00000000-0000-0000-0002-000000000002', 'ID.IM', 'Amélioration', 'Améliorations identifiées à partir des évaluations et exercices', 3);

-- ============================================================
-- Contrôles — PR Protéger
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000003', 'PR.AA', 'Gestion des identités, authentification et accès', 'Accès aux actifs limité aux utilisateurs, services et matériels autorisés', 1),
('00000000-0000-0000-0002-000000000003', 'PR.AT', 'Sensibilisation et formation', 'Personnel formé et sensibilisé à la cybersécurité', 2),
('00000000-0000-0000-0002-000000000003', 'PR.DS', 'Sécurité des données', 'Données gérées conformément à la stratégie de risques', 3),
('00000000-0000-0000-0002-000000000003', 'PR.PS', 'Sécurité des plateformes', 'Sécurité des plateformes matérielles, logicielles et services', 4),
('00000000-0000-0000-0002-000000000003', 'PR.IR', 'Résilience de l''infrastructure technologique', 'Architectures de sécurité pour protéger les actifs', 5);

-- ============================================================
-- Contrôles — DE Détecter
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000004', 'DE.CM', 'Surveillance continue', 'Actifs surveillés pour identifier anomalies et indicateurs de compromission', 1),
('00000000-0000-0000-0002-000000000004', 'DE.AE', 'Analyse des événements', 'Anomalies, indicateurs de compromission et autres événements analysés', 2);

-- ============================================================
-- Contrôles — RS Répondre
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000005', 'RS.MA', 'Gestion des incidents', 'Réponses aux incidents gérés et coordonnés', 1),
('00000000-0000-0000-0002-000000000005', 'RS.AN', 'Analyse des incidents', 'Investigations pour assurer une réponse efficace et support forensique', 2),
('00000000-0000-0000-0002-000000000005', 'RS.CO', 'Communication des incidents', 'Activités de réponse coordonnées avec les parties prenantes', 3),
('00000000-0000-0000-0002-000000000005', 'RS.MI', 'Atténuation des incidents', 'Activités pour prévenir l''expansion et atténuer les effets', 4);

-- ============================================================
-- Contrôles — RC Rétablir
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000006', 'RC.RP', 'Exécution du plan de rétablissement', 'Activités de restauration pour assurer la disponibilité', 1),
('00000000-0000-0000-0002-000000000006', 'RC.CO', 'Communication du rétablissement', 'Activités de restauration coordonnées avec les parties prenantes', 2);

-- ============================================================
-- Correspondances ISO 27001 <-> NIST CSF 2.0
-- ============================================================

-- A.5.1 Politiques de sécurité <-> GV.PO Politiques
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Politiques de sécurité de l''information'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'GV.PO'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.1'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.2 Rôles et responsabilités <-> GV.RR Rôles
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Définition des rôles et responsabilités sécurité'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'GV.RR'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.2'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.9 Inventaire des actifs <-> ID.AM Gestion des actifs
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Inventaire et gestion des actifs informationnels'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'ID.AM'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.9'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.12 Classification des informations <-> PR.DS Sécurité des données
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Classification ISO plus granulaire que sécurité des données NIST'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.DS'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.12'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.15-18 Contrôle d'accès <-> PR.AA Gestion des identités
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'ISO découpe le contrôle d''accès en 4 contrôles, NIST regroupe'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.AA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.15'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.19-22 Fournisseurs <-> GV.SC Supply chain
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'ISO plus détaillé sur les relations fournisseurs'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'GV.SC'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.19'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.24-28 Gestion des incidents <-> RS.MA Gestion des incidents
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Planification et gestion des incidents de sécurité'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'RS.MA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.24'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.29-30 Continuité <-> RC.RP Plan de rétablissement
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Continuité d''activité et rétablissement'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'RC.RP'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.29'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.6.3 Sensibilisation <-> PR.AT Sensibilisation et formation
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Sensibilisation et formation du personnel'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.AT'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.6.3'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.6.8 Signalement <-> RS.CO Communication des incidents
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'related', 'Mécanismes de signalement et communication d''incidents'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'RS.CO'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.6.8'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.5 Authentification sécurisée <-> PR.AA Gestion des identités
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Authentification est un sous-ensemble de la gestion des identités NIST'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.AA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.5'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.8 Gestion des vulnérabilités <-> ID.RA Évaluation des risques
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'related', 'Vulnérabilités techniques contribuent à l''évaluation des risques'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'ID.RA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.8'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.15-16 Journalisation et surveillance <-> DE.CM Surveillance continue
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Journalisation et surveillance des activités'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'DE.CM'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.15'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.13 Sauvegarde <-> PR.IR Résilience de l'infrastructure
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Sauvegarde est un élément de la résilience infrastructure'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.IR'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.13'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';
