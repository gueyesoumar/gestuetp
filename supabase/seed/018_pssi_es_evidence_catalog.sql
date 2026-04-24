-- Seed: Catalogue des preuves PSSI-ES — 155 contrôles
-- Référentiel: PSSI-ES — Sénégal (framework_id = 00000000-0000-0000-0000-000000000017)
-- Chaque contrôle reçoit 1 à 3 preuves documentaires attendues

-- ============================================================
-- ORG — Organisation de la sécurité des SI (REG 1-1 à 1-6)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Attestations de formation des AQSSI', 'Certificats ou attestations de formation SSI des membres du Comité de sécurité', true, 1),
  ('PV de constitution du Comité de sécurité', 'Procès-verbal de création et composition du Comité de sécurité', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 1-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Conventions avec les organismes de formation', 'Contrats ou conventions avec ADIE, STCC-SSI, ARTP ou organismes accrédités', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 1-2' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de sensibilisation des ASSI', 'Programme de sensibilisation continue des Agents de Sécurité des SI', true, 1),
  ('Registre des sessions de sensibilisation', 'Dates, contenus et listes de présence des sessions', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 1-3' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Note d''organisation SSI', 'Note fixant la répartition des responsabilités SSI, proposée par le RSSI et validée', true, 1),
  ('Organigramme SSI', 'Organigramme identifiant RSSI, AQSSI, ASSI et leurs périmètres', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 1-4' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan d''action de mise en place de la PSSI-ES', 'Planning des actions avec jalons, responsables et échéances', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 1-5' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre des documents SSI validés', 'Liste des documents formalisés, dates de validation et versions', true, 1),
  ('PSSI interne de l''entité', 'Politique de sécurité des systèmes d''information validée et signée', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 1-6' and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- PER — Sécurité du personnel (REG 2-1 à 4-6)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Modèle de fiche d''information SSI à l''embauche', 'Document remis aux agents sur leurs rôles et responsabilités SSI', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 2-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Charte d''usage des SI signée', 'Charte d''utilisation responsable des ressources informatiques signée par les agents', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 2-2' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Charte de confidentialité et de non-divulgation', 'Engagement signé par les agents ayant accès aux informations sensibles', true, 1),
  ('Procédure d''habilitation du personnel', 'Processus d''enquête de sécurité et de moralité pour l''accès aux SI sensibles', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 2-3' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Note d''information sur les sanctions', 'Document informant les agents des sanctions en cas de violation de la politique de sécurité', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 2-4' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de signalement des incidents', 'Procédure décrivant le circuit de signalement des incidents SSI', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 2-5' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de protection des données personnelles', 'Document de conformité à la loi 2008-12 sur la protection des données personnelles', true, 1),
  ('Déclaration CDP-SN', 'Récépissé de déclaration auprès de la Commission des Données Personnelles', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 2-6' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des mouvements de personnel', 'Processus d''arrivée, mutation et départ couvrant accès, équipements, habilitations', true, 1),
  ('Checklist de départ/mutation', 'Liste de contrôle pour la restitution des accès et équipements', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 3-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Programme de sensibilisation et formation SSI', 'Document détaillant le programme annuel de sensibilisation et formation', true, 1),
  ('Supports de sensibilisation', 'Présentations, guides ou supports utilisés lors des sessions', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 4-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Preuve d''alignement programme-PSSI', 'Document montrant la cohérence entre le programme de formation et la PSSI', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 4-2' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Matrice de formation par profil', 'Tableau croisant les profils (direction, AQSSI, ASSI, utilisateurs) et les modules de formation', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 4-3' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('PV de revue du programme de sensibilisation', 'Compte-rendu de la dernière mise à jour intégrant les retours d''expérience', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 4-4' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Lettre d''engagement de la direction sur la SSI', 'Communication officielle de la direction affirmant son engagement sur la sécurité SI', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 4-5' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de formation continue SSI', 'Programme de veille technologique et formation continue pour les agents SSI', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 4-6' and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- ACQ — Acquisition et développement des SI (REG 5-1 à 5-4)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Cahier des charges type avec exigences sécurité', 'Modèle de cahier des charges intégrant les exigences SSI', true, 1),
  ('Exemple de cahier des charges d''un projet récent', 'Cahier des charges d''une acquisition récente montrant les clauses sécurité', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 5-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Guide de développement sécurisé', 'Référentiel interne de bonnes pratiques de développement sécurisé', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 5-2' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Référentiel de normes de développement appliquées', 'Liste des normes et standards (ISO, OWASP) utilisés pour le développement', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 5-3' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Contrat de développement externalisé avec clauses SSI', 'Contrat type intégrant exigences sécurité, licences et tests', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 5-4' and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- ACT — Gestion des actifs (REG 6-1 à 6-7)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Inventaire des actifs informationnels', 'Fichier ou base listant matériels, logiciels, données et leurs caractéristiques', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 6-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre des propriétaires d''actifs', 'Tableau d''affectation des actifs à leurs responsables désignés', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 6-2' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''utilisation acceptable des actifs', 'Règles d''utilisation des équipements, logiciels et données', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 6-3' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de restitution des actifs', 'Processus de récupération des équipements et accès en fin de contrat ou mission', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 6-4' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de classification des informations', 'Document définissant les niveaux de classification (Très Secret, Secret, Confidentiel)', true, 1),
  ('Matrice de classification appliquée', 'Exemple de classification appliquée aux données de l''entité', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 6-5' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des supports amovibles', 'Règles de chiffrement, stockage et transport des supports amovibles', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 6-6' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure d''effacement sécurisé des matériels', 'Processus de destruction des données sur les matériels mis au rebut', true, 1),
  ('Registre de mise au rebut', 'Journal des équipements détruits avec date et méthode d''effacement', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 6-7' and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- FRN — Relation avec les fournisseurs (REG 7-1 à 7-9)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sécurité applicable aux fournisseurs', 'Document décrivant les exigences SSI pour les fournisseurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de surveillance de la conformité fournisseurs', 'Processus de contrôle et d''évaluation périodique des fournisseurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-2' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Support de sensibilisation fournisseurs', 'Matériel de sensibilisation SSI destiné au personnel en contact avec les fournisseurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-3' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Charte de sécurité signée par les fournisseurs', 'Modèle de charte SSI avec signatures des parties prenantes', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-4' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Clauses légales dans les contrats fournisseurs', 'Extraits de contrats montrant les clauses protection des données, propriété intellectuelle', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-5' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Fiche du point focal sécurité fournisseurs', 'Nom, rôle et coordonnées du point focal chargé de la communication SSI avec les fournisseurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-6' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre des sous-traitants', 'Liste des sous-traitants intervenant pour le compte de fournisseurs avec leurs accès', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-7' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Clauses de sécurité chaîne d''approvisionnement', 'Extraits contractuels intégrant la conformité sécurité de la chaîne logistique IT', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-8' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapports d''audit des prestations fournisseurs', 'Derniers rapports d''audit ou d''évaluation des fournisseurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 7-9' and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- PHY — Sécurité physique (REG 8-1 à 16-7)
-- Regroupement par objectif pour limiter la volumétrie
-- ============================================================

-- Obj 8 : Périmètres de sécurité (REG 8-1 à 8-8)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan des zones sécurisées', 'Cartographie des zones sécurisées avec niveaux d''accès', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-1' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de contrôle d''accès physique', 'Règles d''autorisation d''accès aux zones sécurisées (badges, autorisations écrites)', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-2' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre d''accès aux zones sécurisées', 'Modèle ou extrait du registre d''accès (identité, but, heure)', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-3' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Fiche de poste agent de sécurité', 'Description des missions de l''agent de sécurité à l''entrée des sites sensibles', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-4' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de fermeture des zones sécurisées', 'Règles de verrouillage hors heures de service', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-5' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de révocation des droits d''accès physique', 'Processus de retrait immédiat des droits en cas de départ, mutation, suspension', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-6' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de conservation des enregistrements d''accès', 'Durée et méthode de sauvegarde des logs d''accès physique', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-7' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapport d''évaluation des risques physiques', 'Résultats de l''analyse de risque physique et choix des contre-mesures', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 8-8' and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 9 : Contrôle d'entrée (REG 9-1 à 9-4)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des visiteurs', 'Processus d''accueil, identification et accompagnement des visiteurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 9-1', 'REG 9-2') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de port de badge obligatoire', 'Règles d''identification visible du personnel et des visiteurs', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 9-3', 'REG 9-4') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 10-11 : Bureaux et zones sécurisées (REG 10-1 à 11-4)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan d''implantation des équipements sensibles', 'Schéma d''installation des équipements clés dans des zones non publiques', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 10-1', 'REG 10-2', 'REG 10-3') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Règlement intérieur des zones sécurisées', 'Règles de travail dans les zones sécurisées (besoin d''en connaître, surveillance, interdictions)', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 11-1', 'REG 11-2', 'REG 11-3', 'REG 11-4') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 12 : Zones de livraison (REG 12-1 à 12-4)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de réception et d''inspection des livraisons', 'Processus de contrôle des matières entrantes et enregistrement', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 12-1', 'REG 12-2', 'REG 12-3', 'REG 12-4') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 13 : Protection des matériels (REG 13-1 à 13-16)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Rapport d''inspection des installations techniques', 'Dernier rapport de contrôle : alarmes, détection incendie, climatisation, alimentation', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 13-1', 'REG 13-2', 'REG 13-3', 'REG 13-4', 'REG 13-5', 'REG 13-6') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan d''alimentation électrique de secours', 'Documentation du générateur de secours et de l''alimentation permanente', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 13-7', 'REG 13-8') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de climatisation et contrôle environnemental', 'Rapport de vérification climatisation, détection eau, humidité et température', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 13-9', 'REG 13-10') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan du site de reprise d''activité', 'Documentation du site de reprise distant avec emplacement et capacités', true, 1)
) as e(name, description, is_required, sort_order)
where c.code = 'REG 13-11' and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de stockage des matériels défectueux', 'Règles de mise au rebut et de stockage sécurisé', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 13-12', 'REG 13-13', 'REG 13-14', 'REG 13-15', 'REG 13-16') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 14 : Câblage (REG 14-1 à 14-7)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de câblage et d''infrastructure réseau', 'Schéma des câblages électriques et télécom avec séparation et conduits', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 14-1', 'REG 14-2', 'REG 14-3', 'REG 14-4', 'REG 14-5', 'REG 14-6', 'REG 14-7') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 15 : Maintenance (REG 15-1 à 15-8)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Contrats de maintenance avec fournisseurs', 'Contrats en vigueur avec clauses qualité, disponibilité et paiement', true, 1),
  ('Registre de maintenance', 'Journal des interventions de maintenance avec traçabilité', true, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 15-1', 'REG 15-2', 'REG 15-3', 'REG 15-4', 'REG 15-5', 'REG 15-6', 'REG 15-7', 'REG 15-8') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 16 : Bureau propre (REG 16-1 à 16-7)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de bureau propre et écran verrouillé', 'Règles de rangement des supports sensibles et de verrouillage automatique des postes', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 16-1', 'REG 16-2', 'REG 16-3', 'REG 16-4', 'REG 16-5', 'REG 16-6', 'REG 16-7') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- LOG — Sécurité logique (REG 17-1 à 19-9-12)
-- ============================================================

-- Obj 17 : Sécurité des accès (REG 17-1 à 17-6)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de contrôle d''accès logique', 'Document décrivant les principes du besoin d''en connaître et d''utiliser, et la revue des droits', true, 1),
  ('Matrice des droits d''accès', 'Tableau des droits d''accès par profil/application/système', true, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 17-1', 'REG 17-2', 'REG 17-3', 'REG 17-4', 'REG 17-5', 'REG 17-6') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 18 : Sécurité des applicatifs (REG 18-1 à 18-12)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de mots de passe', 'Règles de robustesse, renouvellement et interdiction de partage des mots de passe', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 18-7', 'REG 18-8', 'REG 18-9') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des accès applicatifs', 'Processus de contrôle d''accès aux applications (authentification, tentatives, sessions)', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 18-1', 'REG 18-2', 'REG 18-3', 'REG 18-4', 'REG 18-5', 'REG 18-6') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de gestion des logiciels', 'Règles d''installation, désinstallation et contrôle des logiciels autorisés', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 18-10', 'REG 18-11', 'REG 18-12') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 19 : Sécurité des échanges et cryptologie (REG 19-1 à 19-9-12)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sécurité réseau', 'Document décrivant les règles d''accès, segmentation et surveillance du réseau', true, 1),
  ('Schéma d''architecture réseau', 'Diagramme du réseau avec segmentation, pare-feux et points d''accès', true, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 19-1', 'REG 19-2', 'REG 19-3', 'REG 19-4', 'REG 19-5', 'REG 19-6', 'REG 19-7', 'REG 19-8') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de chiffrement et gestion des clés', 'Document couvrant les algorithmes labellisés, longueurs de clés et cycle de vie des clés', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 19-9-1', 'REG 19-9-5', 'REG 19-9-7', 'REG 19-9-11', 'REG 19-9-12') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- EXP — Sécurité de l'exploitation (REG 20-1 à 27-9)
-- ============================================================

-- Obj 20 : Procédures d'exploitation (REG 20-1 à 20-8)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Manuel des procédures d''exploitation', 'Document compilant les procédures d''installation, configuration, redémarrage, sauvegarde', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 20-1', 'REG 20-2', 'REG 20-3', 'REG 20-4', 'REG 20-5') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de gestion des logiciels en exploitation', 'Règles d''installation, licence et audit des logiciels', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 20-6', 'REG 20-7', 'REG 20-8') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 21 : Gestion des changements (REG 21-1 à 21-8)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des changements', 'Processus formel de planification, approbation, test et déploiement des changements', true, 1),
  ('Registre des changements', 'Journal des changements avec évaluation d''impact et approbation', false, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 21-1', 'REG 21-2', 'REG 21-3', 'REG 21-4', 'REG 21-5', 'REG 21-6', 'REG 21-7', 'REG 21-8') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 22 : Séparation des environnements (REG 22-1 à 22-6)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Documentation de séparation des environnements', 'Schéma montrant la séparation dev/test/production et les règles d''accès', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 22-1', 'REG 22-2', 'REG 22-3', 'REG 22-4', 'REG 22-5', 'REG 22-6') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 23 : Protection malware (REG 23-1 à 23-10)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de protection contre les logiciels malveillants', 'Règles de déploiement antivirus, mises à jour, filtrage web et anti-spam', true, 1),
  ('Rapport de couverture antivirus du parc', 'État du déploiement et des mises à jour de l''antivirus sur le parc informatique', true, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 23-1', 'REG 23-2', 'REG 23-3', 'REG 23-4', 'REG 23-5', 'REG 23-6', 'REG 23-7', 'REG 23-8', 'REG 23-9', 'REG 23-10') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 24 : Sauvegarde (REG 24-1, 24-3, 24-4, 24-5, 24-7)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sauvegarde', 'Règles de sauvegarde : fréquence, types, chiffrement, localisation des sauvegardes', true, 1),
  ('PV de test de restauration', 'Résultats du dernier test de restauration des sauvegardes', true, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 24-1', 'REG 24-3', 'REG 24-4', 'REG 24-5', 'REG 24-7') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 25 : Journalisation (REG 25-1 à 25-7)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de journalisation et surveillance', 'Règles de collecte, protection, analyse et conservation des journaux d''événements', true, 1),
  ('Architecture de centralisation des logs', 'Schéma du SIEM ou de la solution de centralisation des journaux', false, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 25-1', 'REG 25-2', 'REG 25-3', 'REG 25-4', 'REG 25-5', 'REG 25-6', 'REG 25-7') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 26 : Synchronisation horloges (REG 26-1 à 26-3)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Configuration NTP', 'Preuve de synchronisation des horloges à un serveur de temps central', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 26-1', 'REG 26-2', 'REG 26-3') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- Obj 27 : Installation logiciels (REG 27-1 à 27-9)
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des mises à jour et correctifs', 'Processus de test, approbation et déploiement des correctifs et mises à jour', true, 1),
  ('Registre des mises à jour appliquées', 'Journal des correctifs avec dates, versions et résultats', false, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 27-1', 'REG 27-2', 'REG 27-3', 'REG 27-5', 'REG 27-7', 'REG 27-8', 'REG 27-9') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- CLM — Cloud, appareils mobiles et télétravail (REG 28-1 à 28-10)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Analyse de risques cloud et externalisation', 'Résultats de l''analyse de risques pour les services externalisés', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 28-1', 'REG 28-2') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''utilisation des appareils mobiles et du télétravail', 'Règles de sécurité pour les terminaux mobiles, le BYOD et le télétravail', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 28-3', 'REG 28-4', 'REG 28-5', 'REG 28-6', 'REG 28-7', 'REG 28-8', 'REG 28-9', 'REG 28-10') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- INC — Gestion des incidents (REG 29-1 à 29-11)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des incidents SSI', 'Processus de détection, signalement, analyse et traitement des incidents', true, 1),
  ('Registre des incidents de sécurité', 'Journal des incidents avec typologie, traitement et enseignements tirés', true, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 29-1', 'REG 29-2', 'REG 29-3', 'REG 29-9', 'REG 29-10', 'REG 29-11') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de continuité d''activité (PCA/PRA)', 'Plan de continuité et de reprise d''activité avec tests périodiques', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 29-4', 'REG 29-5', 'REG 29-6') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Support de formation à la réponse aux incidents', 'Matériel de formation des utilisateurs sur les actions en cas de violation ou d''incident', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 29-7', 'REG 29-8') and d.framework_id = '00000000-0000-0000-0000-000000000017';

-- ============================================================
-- AUD — Audit et conformité (REG 30-1 à 30-7)
-- ============================================================

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Dernier rapport d''audit SSI', 'Rapport d''audit de conformité avec recommandations', true, 1),
  ('Plan de remédiation post-audit', 'Plan d''actions correctives suite au dernier audit', false, 2)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 30-1', 'REG 30-2', 'REG 30-3', 'REG 30-4') and d.framework_id = '00000000-0000-0000-0000-000000000017';

insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c join public.domains d on d.id = c.domain_id
cross join (values
  ('Registre de conformité réglementaire', 'Liste des lois et règlements applicables avec état de conformité (cryptologie, données personnelles, propriété intellectuelle)', true, 1)
) as e(name, description, is_required, sort_order)
where c.code in ('REG 30-5', 'REG 30-6', 'REG 30-7') and d.framework_id = '00000000-0000-0000-0000-000000000017';
