-- 00345 - Gëstu Vendor (RFC 0020 Lot 3b) : preuves d'une evaluation fournisseur.
-- Patron risk_directive_evidence (00328) : table RLS SANS policy authenticated (acces
-- RPC only) ; fichiers dans le bucket partage 'documents' sous le prefixe
-- vendor-assessments/<assessmentId>/... ; acces storage via can_access_vendor_evidence_file
-- branche dans can_access_document_object (candidat portail OU regulateur gestionnaire).

create table if not exists public.vendor_evidence (
  id uuid primary key default gen_random_uuid(),
  vendor_assessment_id uuid not null references public.vendor_assessment(id) on delete cascade,
  control_id uuid references public.controls(id) on delete set null,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ve_assessment on public.vendor_evidence(vendor_assessment_id);
alter table public.vendor_evidence enable row level security; -- aucune policy : acces RPC only

-- Acces fichier : l'assessmentId est le 2e segment du chemin. Candidat portail (org
-- fournisseur) OU regulateur gestionnaire (actor de l'arete).
create or replace function public.can_access_vendor_evidence_file(p_assessment_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vendor_assessment a
    join public.organization_relationships r on r.id = a.relationship_id
    where a.id::text = p_assessment_id and r.nature = 'supplier'
      and (
        (public.is_client_role() and r.target_org_id in (select public.get_my_portal_org_ids()))
        or (not public.is_client_role() and r.actor_org_id = public.get_my_organization_id())
      )
  );
$$;
revoke all on function public.can_access_vendor_evidence_file(text) from public;
grant execute on function public.can_access_vendor_evidence_file(text) to authenticated;

-- Extension de la fonction d'acces aux objets du bucket documents (3e branche).
create or replace function public.can_access_document_object(object_name text)
returns boolean language sql stable set search_path = public as $$
  select (
    (storage.foldername(object_name))[1] = 'missions'
    and (
      exists (select 1 from public.get_my_mission_ids() gm where gm::text = (storage.foldername(object_name))[2])
      or exists (select 1 from public.get_my_client_mission_ids() cm where cm::text = (storage.foldername(object_name))[2])
      or public.is_platform_owner()
    )
  ) or (
    (storage.foldername(object_name))[1] = 'risk-directives'
    and public.can_access_risk_directive_file((storage.foldername(object_name))[2])
  ) or (
    (storage.foldername(object_name))[1] = 'vendor-assessments'
    and public.can_access_vendor_evidence_file((storage.foldername(object_name))[2])
  );
$$;

-- RPC : enregistrer une preuve (apres upload storage). Candidat pendant self_assessment,
-- ou regulateur gestionnaire. Chemin contraint au prefixe de l'evaluation.
create or replace function public.add_vendor_evidence(p_assessment uuid, p_control uuid, p_path text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.is_client_role() then
    perform public._vendor_portal_guard(p_assessment);
    if (select status from public.vendor_assessment where id = p_assessment) <> 'self_assessment' then raise exception 'Auto-évaluation close'; end if;
  else
    perform public._vendor_assessment_guard(p_assessment);
  end if;
  if p_path not like 'vendor-assessments/' || p_assessment::text || '/%' then raise exception 'Chemin non autorisé'; end if;
  insert into public.vendor_evidence (vendor_assessment_id, control_id, file_path, file_name, uploaded_by)
  values (p_assessment, p_control, p_path, p_name, public.get_my_user_id()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.add_vendor_evidence(uuid, uuid, text, text) from public;
grant execute on function public.add_vendor_evidence(uuid, uuid, text, text) to authenticated;

-- RPC : lire les preuves (candidat portail OU regulateur gestionnaire).
create or replace function public.get_vendor_evidence(p_assessment uuid)
returns table (id uuid, control_id uuid, file_path text, file_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.is_client_role() then perform public._vendor_portal_guard(p_assessment);
  else perform public._vendor_assessment_guard(p_assessment); end if;
  return query
    select ve.id, ve.control_id, ve.file_path, ve.file_name, ve.created_at
    from public.vendor_evidence ve where ve.vendor_assessment_id = p_assessment
    order by ve.created_at;
end $$;
revoke all on function public.get_vendor_evidence(uuid) from public;
grant execute on function public.get_vendor_evidence(uuid) to authenticated;

-- RPC : supprimer une preuve (le fichier storage est retire par l'UI).
create or replace function public.delete_vendor_evidence(p_evidence uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_assessment uuid;
begin
  select vendor_assessment_id into v_assessment from public.vendor_evidence where id = p_evidence;
  if v_assessment is null then raise exception 'Preuve introuvable'; end if;
  if public.is_client_role() then
    perform public._vendor_portal_guard(v_assessment);
    if (select status from public.vendor_assessment where id = v_assessment) <> 'self_assessment' then raise exception 'Auto-évaluation close'; end if;
  else
    perform public._vendor_assessment_guard(v_assessment);
  end if;
  delete from public.vendor_evidence where id = p_evidence;
end $$;
revoke all on function public.delete_vendor_evidence(uuid) from public;
grant execute on function public.delete_vendor_evidence(uuid) to authenticated;
