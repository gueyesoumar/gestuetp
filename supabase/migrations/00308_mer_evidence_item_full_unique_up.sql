-- 00308 - Corrige l'upsert des demandes de preuve mutualisée.
-- L'index unique uq_mer_mission_evidence_item (créé en 00277) était PARTIEL
-- (where evidence_item_id is not null). PostgREST ne peut PAS l'utiliser comme arbitre
-- `ON CONFLICT` (il n'émet pas le prédicat WHERE), donc l'edge request-evidence échouait
-- en 500 dès qu'une preuve mutualisée (evidence_item_id non null, ex. PSSI-ES) était
-- demandée : upsert(onConflict: 'mission_id,evidence_item_id') -> « no unique or
-- exclusion constraint matching the ON CONFLICT specification ».
--
-- On le remplace par un index unique COMPLET sur (mission_id, evidence_item_id) :
-- sémantique identique (evidence_item_id NULL reste NULLS DISTINCT par défaut, donc les
-- lignes legacy / autres référentiels coexistent sans conflit), mais cette fois
-- inférable par ON CONFLICT. Les lignes legacy restent dédupliquées par la contrainte
-- unique (mission_id, evidence_catalog_id) existante (00027).

drop index if exists public.uq_mer_mission_evidence_item;

create unique index if not exists uq_mer_mission_evidence_item
  on public.mission_evidence_requests (mission_id, evidence_item_id);
