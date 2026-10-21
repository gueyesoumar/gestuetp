-- 00344 - Gëstu Vendor (RFC 0020 Lot 3a) : voie PORTAIL candidat (auto-evaluation).
-- Voie disjointe de la voie regulateur : cote candidat = utilisateur portail (role=client)
-- rattache au NOEUD org fournisseur via get_my_portal_org_ids() (cloisonnement 00134).
-- Les deux voies ne se rencontrent que dans ces RPC SECURITY DEFINER (patron 00328).

-- 1. Cycle de vie : + 'self_assessment' (candidat ecrit) + 'soumise' (verrouille) -----
alter table public.vendor_assessment drop constraint if exists vendor_assessment_status_check;
alter table public.vendor_assessment add constraint vendor_assessment_status_check
  check (status in ('en_cours', 'self_assessment', 'soumise', 'cloturee'));

-- 2. Cote REGULATEUR : ouvrir la phase d'auto-evaluation (en_cours -> self_assessment) -
create or replace function public.request_vendor_self_assessment(p_assessment uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._vendor_assessment_guard(p_assessment);
  update public.vendor_assessment set status = 'self_assessment', updated_at = now()
  where id = p_assessment and status = 'en_cours';
end $$;
revoke all on function public.request_vendor_self_assessment(uuid) from public;
grant execute on function public.request_vendor_self_assessment(uuid) to authenticated;

-- 3. Garde PORTAIL : l'evaluation cible une org fournisseur du candidat ----------------
create or replace function public._vendor_portal_guard(p_assessment uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_client_role() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.vendor_assessment a
    join public.organization_relationships r on r.id = a.relationship_id
    where a.id = p_assessment and r.nature = 'supplier'
      and r.target_org_id in (select public.get_my_portal_org_ids())
  ) then raise exception 'Évaluation introuvable'; end if;
end $$;
revoke all on function public._vendor_portal_guard(uuid) from public;

-- 4. Cote CANDIDAT : liste de ses auto-evaluations ------------------------------------
create or replace function public.get_my_vendor_self_assessments()
returns table (id uuid, framework_name text, vendor_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, f.name, o.name, a.status, a.created_at
  from public.vendor_assessment a
  join public.organization_relationships r on r.id = a.relationship_id
  join public.frameworks f on f.id = a.framework_id
  join public.organizations o on o.id = r.target_org_id
  where r.nature = 'supplier'
    and r.target_org_id in (select public.get_my_portal_org_ids())
    and public.is_client_role()
    and a.status in ('self_assessment', 'soumise', 'cloturee')
  order by a.created_at desc;
$$;
revoke all on function public.get_my_vendor_self_assessments() from public;
grant execute on function public.get_my_vendor_self_assessments() to authenticated;

-- 5. Cote CANDIDAT : detail (controles + cotation) -----------------------------------
create or replace function public.get_my_vendor_self_assessment_detail(p_assessment uuid)
returns table (control_id uuid, control_code text, control_name text, domain_code text, domain_name text, conformity_level text, status text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._vendor_portal_guard(p_assessment);
  return query
    select c.id, c.code, c.name, d.code, d.name, e.conformity_level,
           (select a.status from public.vendor_assessment a where a.id = p_assessment)
    from public.vendor_control_evaluation e
    join public.controls c on c.id = e.control_id
    join public.domains d on d.id = c.domain_id
    where e.vendor_assessment_id = p_assessment
    order by d.sort_order, c.sort_order, c.code;
end $$;
revoke all on function public.get_my_vendor_self_assessment_detail(uuid) from public;
grant execute on function public.get_my_vendor_self_assessment_detail(uuid) to authenticated;

-- 6. Cote CANDIDAT : coter un controle (seulement pendant self_assessment) ------------
create or replace function public.set_vendor_self_evaluation(p_assessment uuid, p_control uuid, p_level text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._vendor_portal_guard(p_assessment);
  if (select status from public.vendor_assessment where id = p_assessment) <> 'self_assessment' then
    raise exception 'Auto-évaluation close';
  end if;
  if p_level is not null and p_level not in ('nc', 'pc', 'lc', 'c', 'na') then raise exception 'Niveau invalide'; end if;
  update public.vendor_control_evaluation set conformity_level = p_level, note = coalesce(p_note, note)
  where vendor_assessment_id = p_assessment and control_id = p_control;
end $$;
revoke all on function public.set_vendor_self_evaluation(uuid, uuid, text, text) from public;
grant execute on function public.set_vendor_self_evaluation(uuid, uuid, text, text) to authenticated;

-- 7. Cote CANDIDAT : soumettre (self_assessment -> soumise, se verrouille) -----------
create or replace function public.submit_vendor_self_assessment(p_assessment uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._vendor_portal_guard(p_assessment);
  update public.vendor_assessment set status = 'soumise', updated_at = now()
  where id = p_assessment and status = 'self_assessment';
end $$;
revoke all on function public.submit_vendor_self_assessment(uuid) from public;
grant execute on function public.submit_vendor_self_assessment(uuid) to authenticated;
