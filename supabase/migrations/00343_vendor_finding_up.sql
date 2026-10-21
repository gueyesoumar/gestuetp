-- 00343 - Gëstu Vendor (RFC 0020 Lot 2b) : constats d'une evaluation fournisseur.
-- Table parallele a assessment_findings (memes colonnes de qualification) mais ancree
-- sur vendor_assessment, sans toucher la table partagee. Ecritures via RPC SECURITY
-- DEFINER (reutilisent _vendor_assessment_guard de 00342).

create table if not exists public.vendor_finding (
  id uuid primary key default gen_random_uuid(),
  vendor_assessment_id uuid not null references public.vendor_assessment(id) on delete cascade,
  control_id uuid references public.controls(id) on delete set null,
  classification text not null check (classification in ('major_nc', 'minor_nc', 'observation', 'strength')),
  description text not null,
  risk text,
  recommendation text,
  priority text check (priority in ('critical', 'high', 'medium', 'low')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_vf_assessment on public.vendor_finding(vendor_assessment_id);

alter table public.vendor_finding enable row level security;
create policy "vf_select" on public.vendor_finding for select to authenticated
using (not public.is_client_role() and exists (
  select 1 from public.vendor_assessment a
  join public.organization_relationships r on r.id = a.relationship_id
  where a.id = vendor_assessment_id and r.nature = 'supplier' and r.actor_org_id = public.get_my_organization_id()));
create policy "vf_aal2" on public.vendor_finding as restrictive for all to authenticated
using (public.is_aal2()) with check (public.is_aal2());

-- RPC : ajouter un constat
create or replace function public.add_vendor_finding(
  p_assessment uuid, p_classification text, p_description text,
  p_control uuid default null, p_risk text default null, p_recommendation text default null, p_priority text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public._vendor_assessment_guard(p_assessment);
  if p_classification not in ('major_nc', 'minor_nc', 'observation', 'strength') then raise exception 'Classification invalide'; end if;
  if p_priority is not null and p_priority not in ('critical', 'high', 'medium', 'low') then raise exception 'Priorité invalide'; end if;
  if coalesce(btrim(p_description), '') = '' then raise exception 'Description requise'; end if;
  insert into public.vendor_finding (vendor_assessment_id, control_id, classification, description, risk, recommendation, priority, created_by)
  values (p_assessment, p_control, p_classification, p_description, p_risk, p_recommendation, p_priority, public.get_my_user_id())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.add_vendor_finding(uuid, text, text, uuid, text, text, text) from public;
grant execute on function public.add_vendor_finding(uuid, text, text, uuid, text, text, text) to authenticated;

-- RPC : supprimer un constat
create or replace function public.delete_vendor_finding(p_finding uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_assessment uuid;
begin
  select vendor_assessment_id into v_assessment from public.vendor_finding where id = p_finding;
  if v_assessment is null then raise exception 'Constat introuvable'; end if;
  perform public._vendor_assessment_guard(v_assessment);
  delete from public.vendor_finding where id = p_finding;
end $$;
revoke all on function public.delete_vendor_finding(uuid) from public;
grant execute on function public.delete_vendor_finding(uuid) to authenticated;

-- RPC : lecture des constats d'une evaluation
create or replace function public.get_vendor_findings(p_assessment uuid)
returns table (id uuid, control_id uuid, control_code text, classification text, description text, risk text, recommendation text, priority text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select vf.id, vf.control_id, c.code, vf.classification, vf.description, vf.risk, vf.recommendation, vf.priority, vf.created_at
  from public.vendor_finding vf
  left join public.controls c on c.id = vf.control_id
  join public.vendor_assessment a on a.id = vf.vendor_assessment_id
  join public.organization_relationships r on r.id = a.relationship_id
  where vf.vendor_assessment_id = p_assessment and r.nature = 'supplier'
    and r.actor_org_id = public.get_my_organization_id() and not public.is_client_role()
  order by vf.created_at;
$$;
revoke all on function public.get_vendor_findings(uuid) from public;
grant execute on function public.get_vendor_findings(uuid) to authenticated;
