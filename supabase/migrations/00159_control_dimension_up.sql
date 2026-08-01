-- 00159_control_dimension_up.sql
-- Phase A — Mécanisation du mapping contrôle -> dimension du score de confiance.
-- Chaque contrôle porte une dimension primaire ; héritage automatique via crosswalk.

-- Enum : 6 dimensions du score + 2 facteurs transverses (human_factor, third_party).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'score_dimension') then
    create type public.score_dimension as enum (
      'security', 'data_protection', 'resilience', 'integrity',
      'governance', 'verifiability', 'human_factor', 'third_party'
    );
  end if;
end $$;

alter table public.controls
  add column if not exists dimension public.score_dimension,
  add column if not exists dimension_source text
    check (dimension_source in ('ai', 'inherited', 'manual')),
  add column if not exists dimension_confidence numeric;

comment on column public.controls.dimension is
  'Dimension primaire du score de confiance informée par ce contrôle (null = non classé, non compté).';
comment on column public.controls.dimension_source is
  'Provenance du classement : ai | inherited (crosswalk) | manual. Une valeur manuelle n''est jamais écrasée automatiquement.';

-- Héritage automatique par crosswalk : à la création d'un mapping equivalent/partial,
-- un contrôle NON classé hérite de la dimension du contrôle classé auquel il est relié.
create or replace function public.inherit_control_dimension()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  src_dim public.score_dimension;
  tgt_dim public.score_dimension;
begin
  if NEW.relationship not in ('equivalent', 'partial') then
    return NEW;
  end if;
  select dimension into src_dim from public.controls where id = NEW.source_control_id;
  select dimension into tgt_dim from public.controls where id = NEW.target_control_id;

  if tgt_dim is null and src_dim is not null then
    update public.controls
      set dimension = src_dim, dimension_source = 'inherited'
      where id = NEW.target_control_id and dimension is null;
  elsif src_dim is null and tgt_dim is not null then
    update public.controls
      set dimension = tgt_dim, dimension_source = 'inherited'
      where id = NEW.source_control_id and dimension is null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_inherit_control_dimension on public.control_mappings;
create trigger trg_inherit_control_dimension
  after insert on public.control_mappings
  for each row execute function public.inherit_control_dimension();
