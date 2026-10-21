-- 00342 - Gëstu Vendor (RFC 0020 Lot 2) : evaluation securite + verdict de qualification.
-- Reutilise le REFERENTIEL (frameworks/domains/controls) et la formule de conformite
-- (c=100/lc=75/pc=50/nc=0), MAIS pas la couche missions (control_assessments.mission_id
-- NOT NULL, RLS mission-membre incompatibles avec can_manage_vendors). D'ou une table
-- legere ancree sur l'arete 'supplier'. Verdict ecrit cote serveur (auditable).

-- 1. Tables ---------------------------------------------------------------------
create table if not exists public.vendor_assessment (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.organization_relationships(id) on delete cascade,
  framework_id uuid not null references public.frameworks(id),
  status text not null default 'en_cours' check (status in ('en_cours', 'cloturee')),
  score int,
  verdict text check (verdict in ('qualifie', 'qualifie_conditions', 'non_qualifie')),
  assessed_at date,
  valid_until date,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_va_rel on public.vendor_assessment(relationship_id);

create table if not exists public.vendor_control_evaluation (
  id uuid primary key default gen_random_uuid(),
  vendor_assessment_id uuid not null references public.vendor_assessment(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  conformity_level text check (conformity_level in ('nc', 'pc', 'lc', 'c', 'na')),
  note text,
  unique (vendor_assessment_id, control_id)
);
create index if not exists idx_vce_assessment on public.vendor_control_evaluation(vendor_assessment_id);

-- 2. RLS : lecture par l'org GESTIONNAIRE (actor de l'arete). Ecritures via RPC
--    SECURITY DEFINER uniquement (qui controlent l'autorisation).
alter table public.vendor_assessment enable row level security;
alter table public.vendor_control_evaluation enable row level security;

create policy "va_select" on public.vendor_assessment for select to authenticated
using (not public.is_client_role() and exists (
  select 1 from public.organization_relationships r
  where r.id = relationship_id and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id()));
create policy "va_aal2" on public.vendor_assessment as restrictive for all to authenticated
using (public.is_aal2()) with check (public.is_aal2());

create policy "vce_select" on public.vendor_control_evaluation for select to authenticated
using (not public.is_client_role() and exists (
  select 1 from public.vendor_assessment a
  join public.organization_relationships r on r.id = a.relationship_id
  where a.id = vendor_assessment_id and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id()));
create policy "vce_aal2" on public.vendor_control_evaluation as restrictive for all to authenticated
using (public.is_aal2()) with check (public.is_aal2());

-- 3. Garde interne commune (acces en gestion a une evaluation donnee) ------------
create or replace function public._vendor_assessment_guard(p_assessment uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if public.is_client_role() or not public.is_aal2() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if not public.has_cabinet_permission('can_manage_vendors') then raise exception 'Permission can_manage_vendors requise' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.vendor_assessment a
    join public.organization_relationships r on r.id = a.relationship_id
    where a.id = p_assessment and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id()
  ) then raise exception 'Évaluation introuvable'; end if;
end $$;
revoke all on function public._vendor_assessment_guard(uuid) from public;

-- 4. Score (formule de conformite portee ; na/vide exclus) -----------------------
create or replace function public.compute_vendor_assessment_score(p_assessment uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when count(*) filter (where conformity_level in ('nc', 'pc', 'lc', 'c')) = 0 then null
    else round(
      sum(case conformity_level when 'c' then 100 when 'lc' then 75 when 'pc' then 50 when 'nc' then 0 else 0 end)::numeric
      / count(*) filter (where conformity_level in ('nc', 'pc', 'lc', 'c'))
    )::int end
  from public.vendor_control_evaluation where vendor_assessment_id = p_assessment;
$$;
revoke all on function public.compute_vendor_assessment_score(uuid) from public;
grant execute on function public.compute_vendor_assessment_score(uuid) to authenticated;

-- 5. RPC : creer une evaluation (ensemence une ligne par controle du framework) --
create or replace function public.create_vendor_assessment(p_relationship uuid, p_framework uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.is_client_role() or not public.is_aal2() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if not public.has_cabinet_permission('can_manage_vendors') then raise exception 'Permission can_manage_vendors requise' using errcode = '42501'; end if;
  if not exists (select 1 from public.organization_relationships r
                 where r.id = p_relationship and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id())
  then raise exception 'Fournisseur introuvable'; end if;

  insert into public.vendor_assessment (relationship_id, framework_id, created_by)
  values (p_relationship, p_framework, public.get_my_user_id()) returning id into v_id;

  insert into public.vendor_control_evaluation (vendor_assessment_id, control_id)
  select v_id, c.id from public.controls c
  join public.domains d on d.id = c.domain_id
  where d.framework_id = p_framework;

  -- Marque l'arete comme en evaluation (non bloquant si deja).
  update public.vendor_relationship_profile set qualification_status = 'en_evaluation', updated_at = now()
  where relationship_id = p_relationship and qualification_status in ('prospect');

  return v_id;
end $$;
revoke all on function public.create_vendor_assessment(uuid, uuid) from public;
grant execute on function public.create_vendor_assessment(uuid, uuid) to authenticated;

-- 6. RPC : coter un controle --------------------------------------------------
create or replace function public.set_vendor_evaluation(p_assessment uuid, p_control uuid, p_level text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._vendor_assessment_guard(p_assessment);
  if p_level is not null and p_level not in ('nc', 'pc', 'lc', 'c', 'na') then raise exception 'Niveau invalide'; end if;
  update public.vendor_control_evaluation set conformity_level = p_level, note = coalesce(p_note, note)
  where vendor_assessment_id = p_assessment and control_id = p_control;
  update public.vendor_assessment set updated_at = now() where id = p_assessment;
end $$;
revoke all on function public.set_vendor_evaluation(uuid, uuid, text, text) from public;
grant execute on function public.set_vendor_evaluation(uuid, uuid, text, text) to authenticated;

-- 7. RPC : lecture des evaluations d'un fournisseur ----------------------------
create or replace function public.get_vendor_assessments(p_relationship uuid)
returns table (id uuid, framework_id uuid, framework_name text, status text, score int, verdict text, assessed_at date, valid_until date, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.framework_id, f.name, a.status, a.score, a.verdict, a.assessed_at, a.valid_until, a.created_at
  from public.vendor_assessment a
  join public.frameworks f on f.id = a.framework_id
  join public.organization_relationships r on r.id = a.relationship_id
  where a.relationship_id = p_relationship and r.nature = 'supplier'
    and r.actor_org_id = public.get_my_organization_id() and not public.is_client_role()
  order by a.created_at desc;
$$;
revoke all on function public.get_vendor_assessments(uuid) from public;
grant execute on function public.get_vendor_assessments(uuid) to authenticated;

-- 8. RPC : detail (controles + cotation) d'une evaluation ----------------------
create or replace function public.get_vendor_assessment_detail(p_assessment uuid)
returns table (control_id uuid, control_code text, control_name text, domain_code text, domain_name text, dimension text, conformity_level text)
language sql stable security definer set search_path = public as $$
  select c.id, c.code, c.name, d.code, d.name, c.dimension::text, e.conformity_level
  from public.vendor_control_evaluation e
  join public.controls c on c.id = e.control_id
  join public.domains d on d.id = c.domain_id
  join public.vendor_assessment a on a.id = e.vendor_assessment_id
  join public.organization_relationships r on r.id = a.relationship_id
  where e.vendor_assessment_id = p_assessment and r.nature = 'supplier'
    and r.actor_org_id = public.get_my_organization_id() and not public.is_client_role()
  order by d.sort_order, c.sort_order, c.code;
$$;
revoke all on function public.get_vendor_assessment_detail(uuid) from public;
grant execute on function public.get_vendor_assessment_detail(uuid) to authenticated;

-- 9. RPC : cloturer -> score + verdict (seuils 80 / 60) + ecriture sur l'arete --
create or replace function public.close_vendor_assessment(p_assessment uuid, p_valid_months int default 12)
returns table (score int, verdict text) language plpgsql security definer set search_path = public as $$
declare v_score int; v_verdict text; v_rel uuid; v_until date;
begin
  perform public._vendor_assessment_guard(p_assessment);
  v_score := public.compute_vendor_assessment_score(p_assessment);
  if v_score is null then raise exception 'Aucun contrôle évalué'; end if;
  v_verdict := case when v_score >= 80 then 'qualifie' when v_score >= 60 then 'qualifie_conditions' else 'non_qualifie' end;
  v_until := current_date + (coalesce(p_valid_months, 12) || ' months')::interval;

  update public.vendor_assessment
    set status = 'cloturee', score = v_score, verdict = v_verdict, assessed_at = current_date, valid_until = v_until, updated_at = now()
  where id = p_assessment returning relationship_id into v_rel;

  update public.vendor_relationship_profile
    set qualification_status = v_verdict, valid_until = v_until,
        last_assessed_at = current_date, next_assessment_at = v_until, updated_at = now()
  where relationship_id = v_rel;

  return query select v_score, v_verdict;
end $$;
revoke all on function public.close_vendor_assessment(uuid, int) from public;
grant execute on function public.close_vendor_assessment(uuid, int) to authenticated;
