-- Seed: Catalogue des preuves attendues pour ISO 27001:2022
-- Preuves liees aux controles principaux

-- Helper: inserer les preuves en referencant les controles par code
-- A.5.1 Politiques de securite
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de s\u00e9curit\u00e9 de l''information approuv\u00e9e', 'Document de politique sign\u00e9 par la direction', true, 1),
  ('Preuve de diffusion aux collaborateurs', 'Email, accus\u00e9 de r\u00e9ception, ou PV de sensibilisation', true, 2),
  ('PV de revue p\u00e9riodique de la politique', 'Compte-rendu de la derni\u00e8re revue', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.1' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.2 Roles et responsabilites
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Organigramme avec r\u00f4les s\u00e9curit\u00e9', 'Organigramme identifiant le RSSI et les responsables s\u00e9curit\u00e9', true, 1),
  ('Fiches de poste s\u00e9curit\u00e9', 'Fiches de poste incluant les responsabilit\u00e9s s\u00e9curit\u00e9', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.3 Separation des taches
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Matrice de s\u00e9paration des t\u00e2ches', 'Matrice montrant les incompatibilit\u00e9s de fonctions', true, 1),
  ('Liste des acc\u00e8s par profil', 'Extraction des droits d''acc\u00e8s par r\u00f4le/profil', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.9 Inventaire des actifs
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Inventaire des actifs informationnels', 'Liste compl\u00e8te des actifs mat\u00e9riels, logiciels et donn\u00e9es', true, 1),
  ('Proc\u00e9dure de mise \u00e0 jour de l''inventaire', 'Description du processus de tenue \u00e0 jour', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.9' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.12 Classification des informations
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de classification', 'Niveaux de classification d\u00e9finis et document\u00e9s', true, 1),
  ('Exemples de documents classifi\u00e9s', 'Captures ou exemples montrant le marquage appliqu\u00e9', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.12' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.15 Controle d'acces
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de contr\u00f4le d''acc\u00e8s', 'R\u00e8gles de gestion des acc\u00e8s logiques et physiques', true, 1),
  ('Proc\u00e9dure de gestion des habilitations', 'Cr\u00e9ation, modification, r\u00e9vocation des acc\u00e8s', true, 2),
  ('Revue p\u00e9riodique des acc\u00e8s', 'Dernier rapport de revue des droits d''acc\u00e8s', true, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.24 Gestion des incidents
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Proc\u00e9dure de gestion des incidents', 'Processus de d\u00e9tection, escalade et r\u00e9solution', true, 1),
  ('Registre des incidents', 'Journal des incidents de s\u00e9curit\u00e9 des 12 derniers mois', true, 2),
  ('Rapport post-incident', 'Exemple de retour d''exp\u00e9rience apr\u00e8s un incident', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.24' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.29 Continuite
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de continuit\u00e9 d''activit\u00e9 (PCA)', 'Document PCA/PRA formalis\u00e9', true, 1),
  ('Rapport de test du PCA', 'R\u00e9sultats du dernier exercice de continuit\u00e9', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.29' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.3 Sensibilisation et formation
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de sensibilisation annuel', 'Programme de sensibilisation \u00e0 la s\u00e9curit\u00e9', true, 1),
  ('Supports de formation', 'Pr\u00e9sentations, e-learning ou quiz utilis\u00e9s', false, 2),
  ('Attestations de participation', 'Preuves de suivi des formations par les collaborateurs', true, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.5 Authentification securisee
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''authentification', 'R\u00e8gles MFA, complexit\u00e9 mots de passe, expiration', true, 1),
  ('Configuration technique d''authentification', 'Captures de la config AD/SSO/MFA', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.7 Protection malware
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Solution antivirus/EDR d\u00e9ploy\u00e9e', 'Preuve de d\u00e9ploiement et couverture du parc', true, 1),
  ('Rapport de d\u00e9tection r\u00e9cent', 'Dashboard ou rapport des 30 derniers jours', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.7' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.13 Sauvegarde
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sauvegarde', 'Fr\u00e9quence, r\u00e9tention, p\u00e9rim\u00e8tre des sauvegardes', true, 1),
  ('Rapports de tests de restauration', 'R\u00e9sultats du dernier test de restauration', true, 2),
  ('Logs de sauvegarde r\u00e9cents', 'Preuves que les sauvegardes s''ex\u00e9cutent correctement', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.13' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.15 Journalisation
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de journalisation', 'Types d''\u00e9v\u00e9nements journal is\u00e9s, dur\u00e9e de r\u00e9tention', true, 1),
  ('Architecture SIEM/collecte de logs', 'Sch\u00e9ma ou description de l''infrastructure de logs', true, 2),
  ('Exemple d''alertes g\u00e9n\u00e9r\u00e9es', 'Captures d''\u00e9cran d''alertes trait\u00e9es', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.32 Gestion des changements
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Proc\u00e9dure de gestion des changements', 'Processus de demande, validation et d\u00e9ploiement', true, 1),
  ('Registre des changements', 'Historique des changements r\u00e9cents avec approbations', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.32' and d.framework_id = '00000000-0000-0000-0000-000000000010';
