-- Fix: Corriger l'encodage du catalogue de preuves ISO 27001
-- Les \u00e9 ont ete stockes litteralement au lieu des vrais caracteres

-- Supprimer et re-inserer avec les bons caracteres UTF-8
delete from public.evidence_catalog;

-- A.5.1 Politiques de securite
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sécurité de l''information approuvée', 'Document de politique signé par la direction', true, 1),
  ('Preuve de diffusion aux collaborateurs', 'Email, accusé de réception, ou PV de sensibilisation', true, 2),
  ('PV de revue périodique de la politique', 'Compte-rendu de la dernière revue', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.1' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.2 Roles et responsabilites
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Organigramme avec rôles sécurité', 'Organigramme identifiant le RSSI et les responsables sécurité', true, 1),
  ('Fiches de poste sécurité', 'Fiches de poste incluant les responsabilités sécurité', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.3 Separation des taches
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Matrice de séparation des tâches', 'Matrice montrant les incompatibilités de fonctions', true, 1),
  ('Liste des accès par profil', 'Extraction des droits d''accès par rôle/profil', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.9 Inventaire des actifs
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Inventaire des actifs informationnels', 'Liste complète des actifs matériels, logiciels et données', true, 1),
  ('Procédure de mise à jour de l''inventaire', 'Description du processus de tenue à jour', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.9' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.12 Classification des informations
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de classification', 'Niveaux de classification définis et documentés', true, 1),
  ('Exemples de documents classifiés', 'Captures ou exemples montrant le marquage appliqué', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.12' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.15 Controle d'acces
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de contrôle d''accès', 'Règles de gestion des accès logiques et physiques', true, 1),
  ('Procédure de gestion des habilitations', 'Création, modification, révocation des accès', true, 2),
  ('Revue périodique des accès', 'Dernier rapport de revue des droits d''accès', true, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.24 Gestion des incidents
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des incidents', 'Processus de détection, escalade et résolution', true, 1),
  ('Registre des incidents', 'Journal des incidents de sécurité des 12 derniers mois', true, 2),
  ('Rapport post-incident', 'Exemple de retour d''expérience après un incident', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.24' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.5.29 Continuite
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de continuité d''activité (PCA)', 'Document PCA/PRA formalisé', true, 1),
  ('Rapport de test du PCA', 'Résultats du dernier exercice de continuité', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.5.29' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.6.3 Sensibilisation et formation
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Plan de sensibilisation annuel', 'Programme de sensibilisation à la sécurité', true, 1),
  ('Supports de formation', 'Présentations, e-learning ou quiz utilisés', false, 2),
  ('Attestations de participation', 'Preuves de suivi des formations par les collaborateurs', true, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.6.3' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.5 Authentification securisee
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique d''authentification', 'Règles MFA, complexité mots de passe, expiration', true, 1),
  ('Configuration technique d''authentification', 'Captures de la config AD/SSO/MFA', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.7 Protection malware
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Solution antivirus/EDR déployée', 'Preuve de déploiement et couverture du parc', true, 1),
  ('Rapport de détection récent', 'Dashboard ou rapport des 30 derniers jours', false, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.7' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.13 Sauvegarde
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de sauvegarde', 'Fréquence, rétention, périmètre des sauvegardes', true, 1),
  ('Rapports de tests de restauration', 'Résultats du dernier test de restauration', true, 2),
  ('Logs de sauvegarde récents', 'Preuves que les sauvegardes s''exécutent correctement', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.13' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.15 Journalisation
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Politique de journalisation', 'Types d''événements journalisés, durée de rétention', true, 1),
  ('Architecture SIEM/collecte de logs', 'Schéma ou description de l''infrastructure de logs', true, 2),
  ('Exemple d''alertes générées', 'Captures d''écran d''alertes traitées', false, 3)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

-- A.8.32 Gestion des changements
insert into public.evidence_catalog (control_id, name, description, is_required, sort_order)
select c.id, e.name, e.description, e.is_required, e.sort_order
from public.controls c
join public.domains d on d.id = c.domain_id
cross join (values
  ('Procédure de gestion des changements', 'Processus de demande, validation et déploiement', true, 1),
  ('Registre des changements', 'Historique des changements récents avec approbations', true, 2)
) as e(name, description, is_required, sort_order)
where c.code = 'A.8.32' and d.framework_id = '00000000-0000-0000-0000-000000000010';
