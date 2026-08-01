-- 00159_control_dimension_down.sql — rollback de la Phase A (mapping dimension).

drop trigger if exists trg_inherit_control_dimension on public.control_mappings;
drop function if exists public.inherit_control_dimension();

alter table public.controls
  drop column if exists dimension_confidence,
  drop column if exists dimension_source,
  drop column if exists dimension;

drop type if exists public.score_dimension;
