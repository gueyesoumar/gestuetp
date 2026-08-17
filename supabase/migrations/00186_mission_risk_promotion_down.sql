-- 00186 — rollback : promotion mission_risk → registre Gëstu Risk

drop function if exists public.promote_mission_risk(uuid, public.score_dimension, int, int, text, uuid, uuid);

alter table public.mission_risks
  drop column if exists promoted_at;
