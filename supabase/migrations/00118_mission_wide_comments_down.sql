-- Migration: mission_wide_comments (DOWN)
-- Rollback de 00118_mission_wide_comments_up.sql
--
-- ATTENTION : si des commentaires mission-wide (control_id IS NULL) existent déjà,
-- la contrainte NOT NULL échouera. Il faut les supprimer ou leur assigner un control_id.

drop index if exists public.idx_control_comments_mission_only;

-- Si des rows ont control_id NULL, ce ALTER échouera. Décommenter si on veut purger :
-- delete from public.control_comments where control_id is null;

alter table public.control_comments
  alter column control_id set not null;
