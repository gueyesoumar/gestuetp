-- Seed: Referentiel NIST Cybersecurity Framework 2.0

insert into public.frameworks (id, name, slug, description, version, publisher)
values (
  '00000000-0000-0000-0000-000000000011',
  'NIST Cybersecurity Framework',
  'nist-csf',
  'Cadre de cybersecurite du NIST. Organise en 6 fonctions : Gouverner, Identifier, Proteger, Detecter, Repondre, Retablir.',
  '2.0',
  'NIST'
);

-- ============================================================
-- Domaines (6 fonctions NIST CSF 2.0)
-- ============================================================

insert into public.domains (id, framework_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000011', 'GV', 'Gouverner (Govern)', 'Strategie de gestion des risques cyber, attentes et politiques', 1),
('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000011', 'ID', 'Identifier (Identify)', 'Comprehension du contexte, des actifs, des risques', 2),
('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000011', 'PR', 'Proteger (Protect)', 'Mesures de protection pour limiter l''impact des menaces', 3),
('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000011', 'DE', 'Detecter (Detect)', 'Detection rapide des evenements de cybersecurite', 4),
('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000011', 'RS', 'Repondre (Respond)', 'Actions face a un incident de cybersecurite detecte', 5),
('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-000000000011', 'RC', 'Retablir (Recover)', 'Restauration des capacites et services apres un incident', 6);

-- ============================================================
-- Controles — GV Gouverner
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000001', 'GV.OC', 'Contexte organisationnel', 'Comprehension du contexte de l''organisation pour la gestion des risques cyber', 1),
('00000000-0000-0000-0002-000000000001', 'GV.RM', 'Strategie de gestion des risques', 'Priorites, contraintes, tolerance au risque, appetence', 2),
('00000000-0000-0000-0002-000000000001', 'GV.RR', 'Roles, responsabilites et autorites', 'Roles et responsabilites en cybersecurite etablis et communiques', 3),
('00000000-0000-0000-0002-000000000001', 'GV.PO', 'Politiques', 'Politiques de cybersecurite etablies, communiquees et appliquees', 4),
('00000000-0000-0000-0002-000000000001', 'GV.OV', 'Supervision', 'Supervision de la strategie de cybersecurite', 5),
('00000000-0000-0000-0002-000000000001', 'GV.SC', 'Gestion de la chaine d''approvisionnement cyber', 'Risques de la supply chain identifies et geres', 6);

-- ============================================================
-- Controles — ID Identifier
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000002', 'ID.AM', 'Gestion des actifs', 'Inventaire des actifs (materiels, logiciels, donnees, systemes)', 1),
('00000000-0000-0000-0002-000000000002', 'ID.RA', 'Evaluation des risques', 'Risques identifies, analyses et priorises', 2),
('00000000-0000-0000-0002-000000000002', 'ID.IM', 'Amelioration', 'Ameliorations identifiees a partir des evaluations et exercices', 3);

-- ============================================================
-- Controles — PR Proteger
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000003', 'PR.AA', 'Gestion des identites, authentification et acces', 'Acces aux actifs limite aux utilisateurs, services et materiels autorises', 1),
('00000000-0000-0000-0002-000000000003', 'PR.AT', 'Sensibilisation et formation', 'Personnel forme et sensibilise a la cybersecurite', 2),
('00000000-0000-0000-0002-000000000003', 'PR.DS', 'Securite des donnees', 'Donnees gerees conformement a la strategie de risques', 3),
('00000000-0000-0000-0002-000000000003', 'PR.PS', 'Securite des plateformes', 'Securite des plateformes materielles, logicielles et services', 4),
('00000000-0000-0000-0002-000000000003', 'PR.IR', 'Resilience de l''infrastructure technologique', 'Architectures de securite pour proteger les actifs', 5);

-- ============================================================
-- Controles — DE Detecter
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000004', 'DE.CM', 'Surveillance continue', 'Actifs surveilles pour identifier anomalies et indicateurs de compromission', 1),
('00000000-0000-0000-0002-000000000004', 'DE.AE', 'Analyse des evenements', 'Anomalies, indicateurs de compromission et autres evenements analyses', 2);

-- ============================================================
-- Controles — RS Repondre
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000005', 'RS.MA', 'Gestion des incidents', 'Reponses aux incidents geres et coordonnes', 1),
('00000000-0000-0000-0002-000000000005', 'RS.AN', 'Analyse des incidents', 'Investigations pour assurer une reponse efficace et support forensique', 2),
('00000000-0000-0000-0002-000000000005', 'RS.CO', 'Communication des incidents', 'Activites de reponse coordonnees avec les parties prenantes', 3),
('00000000-0000-0000-0002-000000000005', 'RS.MI', 'Attenuation des incidents', 'Activites pour prevenir l''expansion et attenuer les effets', 4);

-- ============================================================
-- Controles — RC Retablir
-- ============================================================

insert into public.controls (domain_id, code, name, description, sort_order) values
('00000000-0000-0000-0002-000000000006', 'RC.RP', 'Execution du plan de retablissement', 'Activites de restauration pour assurer la disponibilite', 1),
('00000000-0000-0000-0002-000000000006', 'RC.CO', 'Communication du retablissement', 'Activites de restauration coordonnees avec les parties prenantes', 2);

-- ============================================================
-- Correspondances ISO 27001 <-> NIST CSF 2.0
-- ============================================================

-- A.5.1 Politiques de securite <-> GV.PO Politiques
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Politiques de securite de l''information'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'GV.PO'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.1'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.2 Roles et responsabilites <-> GV.RR Roles
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Definition des roles et responsabilites securite'
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

-- A.5.12 Classification des informations <-> PR.DS Securite des donnees
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Classification ISO plus granulaire que securite des donnees NIST'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.DS'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.12'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.15-18 Controle d'acces <-> PR.AA Gestion des identites
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'ISO decoupe le controle d''acces en 4 controles, NIST regroupe'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.AA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.15'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.19-22 Fournisseurs <-> GV.SC Supply chain
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'ISO plus detaille sur les relations fournisseurs'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'GV.SC'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.19'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.24-28 Gestion des incidents <-> RS.MA Gestion des incidents
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Planification et gestion des incidents de securite'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'RS.MA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.5.24'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.5.29-30 Continuite <-> RC.RP Plan de retablissement
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Continuite d''activite et retablissement'
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
select iso.id, nist.id, 'related', 'Mecanismes de signalement et communication d''incidents'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'RS.CO'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.6.8'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.5 Authentification securisee <-> PR.AA Gestion des identites
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Authentification est un sous-ensemble de la gestion des identites NIST'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.AA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.5'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.8 Gestion des vulnerabilites <-> ID.RA Evaluation des risques
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'related', 'Vulnerabilites techniques contribuent a l''evaluation des risques'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'ID.RA'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.8'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.15-16 Journalisation et surveillance <-> DE.CM Surveillance continue
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'equivalent', 'Journalisation et surveillance des activites'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'DE.CM'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.15'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';

-- A.8.13 Sauvegarde <-> PR.IR Resilience de l'infrastructure
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select iso.id, nist.id, 'partial', 'Sauvegarde est un element de la resilience infrastructure'
from public.controls iso
join public.domains iso_d on iso_d.id = iso.domain_id
join public.controls nist on nist.code = 'PR.IR'
join public.domains nist_d on nist_d.id = nist.domain_id
where iso.code = 'A.8.13'
  and iso_d.framework_id = '00000000-0000-0000-0000-000000000010'
  and nist_d.framework_id = '00000000-0000-0000-0000-000000000011';
