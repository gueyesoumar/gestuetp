-- Migration: mission_wide_comments (UP)
-- Description: Étend control_comments pour supporter les commentaires de niveau MISSION
-- (control_id IS NULL). Utilisé par le panneau Discussion de la revue interne pour
-- permettre à lead/associé d'échanger sur la cohérence d'ensemble (hors d'un contrôle
-- spécifique).
--
-- Changements :
--   1. control_id devient nullable (au niveau colonne)
--   2. Les policies SELECT/INSERT/UPDATE existantes restent valides — elles filtrent
--      uniquement par mission_id, donc elles autorisent déjà control_id NULL
--   3. Index supplémentaire pour les requêtes mission-wide

alter table public.control_comments
  alter column control_id drop not null;

comment on column public.control_comments.control_id is
  'Contrôle ciblé (NULL = commentaire de niveau mission, utilisé par la revue interne)';

create index if not exists idx_control_comments_mission_only
  on public.control_comments(mission_id, created_at desc)
  where control_id is null;
