-- Migration: control_comments (DOWN)
-- Description: Rollback de 00103_control_comments_up.sql.
-- DROP TABLE cascade supprime indexes, trigger, et policies RLS.

drop table if exists public.control_comments cascade;
