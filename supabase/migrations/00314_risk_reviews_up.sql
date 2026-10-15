-- 00314 - Gëstu Risk / RFC 0017 Lot 4 : revue & historisation (ISO 27005 §10).
-- Cadence + prochaine revue sur le scénario, journal des revues (= instantanés du
-- résiduel dans le temps, le résiduel n'étant pas persisté ailleurs). Additif.

alter table public.risk_scenarios
  add column review_frequency_months int,   -- null = fallback risk_criteria.review_default_months (défaut 6)
  add column last_reviewed_at timestamptz,
  add column next_review_at date;

create index idx_risk_scenarios_next_review on public.risk_scenarios(next_review_at);

create table public.risk_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_scenario_id uuid not null references public.risk_scenarios(id) on delete cascade,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  decision text not null check (decision in ('maintain','retreat','accept','close','reopen')),
  inherent_level int,
  residual_level int,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.risk_reviews is
  'Journal des revues périodiques d''un scénario (RFC 0017 Lot 4). residual_level/inherent_level = instantanés fournis au moment de la revue -> tendance.';

create index idx_rr_scenario on public.risk_reviews(risk_scenario_id);

-- RLS : org-scoped, personnel non-client. Pas de permission dédiée (activité courante).
alter table public.risk_reviews enable row level security;

create policy "rr_org" on public.risk_reviews for all to authenticated
  using (organization_id = public.get_my_organization_id() and not public.is_client_role())
  with check (organization_id = public.get_my_organization_id() and not public.is_client_role());

create policy "rr_aal2" on public.risk_reviews as restrictive for all to authenticated
  using (public.is_aal2());

-- AFTER INSERT : met à jour cadence/prochaine revue + lifecycle sur close/reopen.
create or replace function public.risk_review_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_freq int;
begin
  select coalesce(rs.review_frequency_months, rc.review_default_months, 6)
    into v_freq
    from public.risk_scenarios rs
    left join public.risk_criteria rc on rc.organization_id = rs.organization_id
    where rs.id = NEW.risk_scenario_id;

  update public.risk_scenarios set
    last_reviewed_at = NEW.reviewed_at,
    next_review_at = (NEW.reviewed_at::date + (v_freq || ' months')::interval)::date,
    lifecycle_status = case NEW.decision
      when 'close' then 'closed'
      when 'reopen' then 'reopened'
      else lifecycle_status end,
    updated_at = now()
  where id = NEW.risk_scenario_id;
  return NEW;
end $$;

create trigger trg_risk_review_after_insert
  after insert on public.risk_reviews
  for each row execute function public.risk_review_after_insert();
