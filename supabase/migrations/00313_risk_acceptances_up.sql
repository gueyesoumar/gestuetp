-- 00313 - Gëstu Risk / RFC 0017 Lot 3 : acceptation formelle du risque résiduel.
-- Qui accepte, résiduel figé, justification, validité ; verrou au-dessus du seuil
-- (dérogation motivée) ; invalidation automatique si le risque empire. Additif.

create table public.risk_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_scenario_id uuid not null references public.risk_scenarios(id) on delete cascade,
  residual_level int not null,                 -- résiduel figé au moment de l'acceptation
  accepted_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz not null default now(),
  justification text,
  valid_until date,
  is_derogation boolean not null default false, -- acceptation au-dessus du seuil
  status text not null default 'active' check (status in ('active','expired','revoked','superseded')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.risk_acceptances is
  'Décisions d''acceptation du risque résiduel (RFC 0017 Lot 3). Une seule active par scénario ; invalidation auto (superseded) si le risque empire.';

create index idx_ra_scenario on public.risk_acceptances(risk_scenario_id);
create unique index uq_ra_one_active on public.risk_acceptances(risk_scenario_id) where status = 'active';

create trigger trg_ra_updated_at
  before update on public.risk_acceptances
  for each row execute function public.set_updated_at();

-- Permission cabinet : droit d'accepter un risque (pattern 00179).
update public.platform_roles
set permissions = permissions || '{"can_accept_risk": true}'::jsonb
where coalesce((permissions->>'can_manage_roles')::boolean, false) = true;

-- RLS : lecture org ; écriture gated par can_accept_risk ; AAL2.
alter table public.risk_acceptances enable row level security;

create policy "ra_select" on public.risk_acceptances for select to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role());

create policy "ra_write" on public.risk_acceptances for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role() and public.has_cabinet_permission('can_accept_risk'))
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role() and public.has_cabinet_permission('can_accept_risk'));

create policy "ra_aal2" on public.risk_acceptances as restrictive for all to authenticated
  using (public.is_aal2());

-- ============================================================
-- Règles serveur (SECURITY DEFINER, search_path vide)
-- ============================================================

-- BEFORE INSERT : une seule active / scénario + dérogation obligatoire hors seuil.
create or replace function public.risk_acceptance_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_threshold int;
begin
  update public.risk_acceptances set status = 'superseded', updated_at = now()
    where risk_scenario_id = NEW.risk_scenario_id and status = 'active';
  select coalesce((select acceptance_threshold from public.risk_criteria where organization_id = NEW.organization_id), 60)
    into v_threshold;
  if NEW.residual_level > v_threshold
     and (NEW.is_derogation is not true or coalesce(btrim(NEW.justification), '') = '') then
    raise exception 'Acceptation refusee : residuel (%) au-dessus du seuil (%). Derogation motivee requise.',
      NEW.residual_level, v_threshold;
  end if;
  return NEW;
end $$;

create trigger trg_risk_acceptance_before_insert
  before insert on public.risk_acceptances
  for each row execute function public.risk_acceptance_before_insert();

-- AFTER INSERT : une acceptation active place le scénario en residual_accepted.
create or replace function public.risk_acceptance_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.status = 'active' then
    update public.risk_scenarios set lifecycle_status = 'residual_accepted', updated_at = now()
      where id = NEW.risk_scenario_id;
  end if;
  return NEW;
end $$;

create trigger trg_risk_acceptance_after_insert
  after insert on public.risk_acceptances
  for each row execute function public.risk_acceptance_after_insert();

-- Invalidation : supersede les acceptations actives d'un scénario + rouvre la revue.
create or replace function public.supersede_risk_acceptances(p_scenario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.risk_acceptances set status = 'superseded', updated_at = now()
    where risk_scenario_id = p_scenario and status = 'active';
  update public.risk_scenarios set lifecycle_status = 'reopened', updated_at = now()
    where id = p_scenario and lifecycle_status = 'residual_accepted';
end $$;

-- Événements observables qui font monter le résiduel -> invalidation.
create or replace function public.trg_rs_cotation_supersede()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.supersede_risk_acceptances(NEW.id); return NEW; end $$;

create trigger trg_rs_cotation_supersede
  after update on public.risk_scenarios
  for each row
  when (NEW.inherent_likelihood > OLD.inherent_likelihood or NEW.inherent_impact > OLD.inherent_impact)
  execute function public.trg_rs_cotation_supersede();

create or replace function public.trg_incident_link_supersede()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.supersede_risk_acceptances(NEW.risk_scenario_id); return NEW; end $$;

create trigger trg_incident_link_supersede
  after insert on public.incident_risk_links
  for each row execute function public.trg_incident_link_supersede();

create or replace function public.trg_rcl_delete_supersede()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.supersede_risk_acceptances(OLD.risk_scenario_id); return OLD; end $$;

create trigger trg_rcl_delete_supersede
  after delete on public.risk_control_links
  for each row execute function public.trg_rcl_delete_supersede();
