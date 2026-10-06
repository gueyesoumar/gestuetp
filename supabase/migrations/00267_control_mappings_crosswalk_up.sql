-- 00267 — Crosswalk intra-ISO 27001 (Lot 2, cohérence inter-contrôles + constat systémique).
--
-- control_mappings existe (00025) mais n'est alimentée que par des fichiers seed/ (NIST/COBIT/
-- ITIL) QUE LE DÉPLOIEMENT NE JOUE PAS (migrate.sh ne traite que migrations/). Aucun mapping
-- intra-ISO n'existe. On seede donc le crosswalk ISO↔ISO DANS la migration (précédent 00183
-- risk_catalog), afin qu'il soit appliqué sur staging/prod par migrate.sh/deploy.yml.
--
-- Les paires sont insérées dans UN sens ; les lectures interrogent source OU target.

-- Contrainte de valeurs (le commentaire 00025 documentait equivalent/partial/related sans CHECK).
-- Les seeds existants n'utilisent que ces 3 valeurs → ajout sûr.
alter table public.control_mappings
  add constraint chk_control_mappings_relationship
  check (relationship in ('equivalent', 'partial', 'related'));

-- Crosswalk curé intra-ISO 27001:2022 (framework 00000000-0000-0000-0000-000000000010).
with pairs(src, tgt, rel, note) as (
  values
    -- Contrôle d'accès / identités / authentification / privilèges
    ('A.5.15', 'A.8.3',  'equivalent', 'Contrôle d''accès (politique) ↔ restriction d''accès (mise en œuvre)'),
    ('A.5.17', 'A.8.5',  'equivalent', 'Informations d''authentification ↔ authentification sécurisée'),
    ('A.5.16', 'A.8.5',  'related',    'Gestion des identités ↔ authentification sécurisée'),
    ('A.5.18', 'A.8.2',  'related',    'Droits d''accès ↔ droits d''accès privilégiés'),
    ('A.8.2',  'A.8.3',  'related',    'Droits privilégiés ↔ restriction d''accès aux informations'),
    -- Classification / marquage des informations
    ('A.5.12', 'A.5.13', 'equivalent', 'Classification ↔ marquage des informations'),
    -- Continuité / sauvegarde / redondance
    ('A.5.29', 'A.5.30', 'related',    'Sécurité en cas de perturbation ↔ préparation des TIC pour la continuité'),
    ('A.5.30', 'A.8.14', 'related',    'Continuité TIC ↔ redondance des moyens de traitement'),
    ('A.8.13', 'A.8.14', 'related',    'Sauvegarde ↔ redondance'),
    -- Gestion des incidents
    ('A.5.24', 'A.5.26', 'related',    'Planification de la gestion des incidents ↔ réponse aux incidents'),
    ('A.5.25', 'A.5.26', 'related',    'Appréciation des événements ↔ réponse aux incidents'),
    ('A.5.26', 'A.5.27', 'related',    'Réponse aux incidents ↔ enseignements des incidents'),
    -- Journalisation / surveillance / renseignement sur les menaces
    ('A.8.15', 'A.8.16', 'equivalent', 'Journalisation ↔ activités de surveillance'),
    ('A.5.7',  'A.8.16', 'related',    'Renseignements sur les menaces ↔ surveillance'),
    -- Sécurité des réseaux
    ('A.8.20', 'A.8.21', 'related',    'Sécurité des réseaux ↔ sécurité des services réseau'),
    ('A.8.20', 'A.8.22', 'related',    'Sécurité des réseaux ↔ cloisonnement des réseaux'),
    ('A.8.22', 'A.8.23', 'related',    'Cloisonnement des réseaux ↔ filtrage web'),
    -- Chaîne fournisseurs
    ('A.5.19', 'A.5.20', 'related',    'Relations fournisseurs ↔ accords fournisseurs'),
    ('A.5.20', 'A.5.21', 'related',    'Accords fournisseurs ↔ chaîne d''approvisionnement TIC'),
    ('A.5.22', 'A.5.23', 'related',    'Surveillance des services fournisseurs ↔ sécurité des services en nuage'),
    -- Actifs
    ('A.5.9',  'A.5.10', 'related',    'Inventaire des actifs ↔ utilisation correcte des actifs'),
    -- Développement
    ('A.8.25', 'A.8.28', 'related',    'Cycle de vie de développement sécurisé ↔ codage sécurisé'),
    ('A.8.25', 'A.8.31', 'related',    'Développement sécurisé ↔ séparation dev/test/prod'),
    ('A.8.8',  'A.8.9',  'related',    'Gestion des vulnérabilités techniques ↔ gestion de la configuration')
)
insert into public.control_mappings (source_control_id, target_control_id, relationship, notes)
select cs.id, ct.id, p.rel, p.note
from pairs p
join public.controls cs on cs.code = p.src
join public.domains dsrc on cs.domain_id = dsrc.id and dsrc.framework_id = '00000000-0000-0000-0000-000000000010'
join public.controls ct on ct.code = p.tgt
join public.domains dtgt on ct.domain_id = dtgt.id and dtgt.framework_id = '00000000-0000-0000-0000-000000000010'
on conflict (source_control_id, target_control_id) do nothing;
