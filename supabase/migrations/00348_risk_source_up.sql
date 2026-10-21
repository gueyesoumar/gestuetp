-- 00348 (UP) - Source du risque (#4) : distingue qui/quoi a cree le scenario.
--   self      = saisi par l'organisation elle-meme (defaut)
--   regulator = cree par le regulateur superviseur (via RPC du Lot 3)
--   system    = issu de Gestu Regul (promotion d'un constat / mission / modele)
-- D1=A : colonne generique + libelles par edition cote front.

alter table public.risk_scenarios
  add column if not exists source text not null default 'self'
  check (source in ('self', 'regulator', 'system'));

-- Derivation 'system' pour les scenarios materialises par le pipeline de promotion
-- (constat / mission). Ne touche jamais une source posee explicitement (ex. 'regulator').
create or replace function public.risk_scenario_set_source()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'self' and (new.source_mission_id is not null or new.source_risk_id is not null) then
    new.source := 'system';
  end if;
  return new;
end $$;

drop trigger if exists trg_risk_scenario_set_source on public.risk_scenarios;
create trigger trg_risk_scenario_set_source
  before insert on public.risk_scenarios
  for each row execute function public.risk_scenario_set_source();

-- Backfill des scenarios deja promus -> 'system'. Triggers utilisateurs desactives
-- le temps du backfill (evite le gate de capacite et le bruit de piste d'audit).
alter table public.risk_scenarios disable trigger user;
update public.risk_scenarios
  set source = 'system'
  where source = 'self' and (source_mission_id is not null or source_risk_id is not null);
alter table public.risk_scenarios enable trigger user;

-- get_supervised_risks : expose la source aux vues superviseur (registre consolide).
-- Changement de type de retour -> drop avant recreate (rappel CI).
drop function if exists public.get_supervised_risks(uuid);
create or replace function public.get_supervised_risks(p_org_id uuid default null)
returns table (
  id uuid, organization_id uuid, org_name text, org_sector text, org_is_iic boolean,
  title text, dimension text,
  inherent_likelihood int, inherent_impact int, treatment text,
  lifecycle_status text, next_review_at date,
  threat_ref uuid, feared_event_ref uuid, vulnerability text, asset_name text, source text)
language sql stable security definer set search_path = '' as $$
  select rs.id, rs.organization_id, o.name, o.sector, (coalesce(erp.criticality, 'standard') = 'eleve'),
    rs.title, rs.dimension::text,
    rs.inherent_likelihood, rs.inherent_impact, rs.treatment,
    rs.lifecycle_status::text, rs.next_review_at,
    rs.threat_ref, rs.feared_event_ref, rs.vulnerability, ra.name, rs.source
  from public.risk_scenarios rs
  join public.organizations o on o.id = rs.organization_id
  left join public.entity_regulatory_profile erp on erp.organization_id = o.id
  left join public.risk_assets ra on ra.id = rs.asset_id
  where (p_org_id is null or rs.organization_id = p_org_id)
    and rs.organization_id in (select public.get_my_supervised_org_ids())
  order by o.name, (rs.inherent_likelihood * rs.inherent_impact) desc, rs.title;
$$;
revoke all on function public.get_supervised_risks(uuid) from public;
grant execute on function public.get_supervised_risks(uuid) to authenticated;
