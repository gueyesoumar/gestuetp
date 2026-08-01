-- 00134 — Cloisonnement client (passe 2/2, hors organizations) : neutralise pour
-- les clients les 2 helpers staff utilises par ~toutes les policies SELECT/write.
--
-- Constat : un user role=client (organization_id = org du cabinet) declenchait les
-- policies staff via get_my_organization_id() (org/cabinet/client/groupe) et
-- get_my_mission_ids() (equipe), lisant les donnees internes de missions non
-- accordees. Les chemins CLIENT legitimes passent TOUS par les policies cp_*
-- (is_client_role() + get_my_client_mission_ids()) ; aucun chemin client (lecture,
-- ecriture, login) n'utilise ces 2 helpers (login = users_select_self sur auth_id).
-- => On fait renvoyer "rien" a ces 2 helpers pour un client : toutes les policies
-- staff/groupe/legacy cessent de matcher pour lui (sur TOUTES les tables, sans
-- enumeration), sans impacter auditeurs ni platform owner (role != client).
-- Anti-recursion : helpers SECURITY DEFINER, ne s'interrogent pas eux-memes.

-- 1) Portee "organisation" : nulle pour un client (il n'appartient pas au cabinet
--    au sens metier ; son acces est par mission accordee via cp_*).
create or replace function public.get_my_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.users
  where auth_id = auth.uid()
    and is_active = true
    and role <> 'client'
  limit 1;
$$;

-- 2) Missions "equipe" : vides pour un client (il utilise get_my_client_mission_ids).
create or replace function public.get_my_mission_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select mission_id
  from public.mission_members
  where user_id = public.get_my_user_id()
    and not public.is_client_role();
$$;

-- 3) Straggler : findings_select_client fait un join direct sur users.organization_id
--    (n'utilise pas les helpers ci-dessus) -> garde de role explicite.
drop policy if exists "findings_select_client" on public.assessment_findings;
create policy "findings_select_client"
  on public.assessment_findings for select
  to authenticated
  using (
    not public.is_client_role()
    and exists (
      select 1 from public.control_assessments ca
      join public.missions m on m.id = ca.mission_id
      join public.users u on u.organization_id = m.client_id
      where ca.id = assessment_findings.assessment_id
        and u.auth_id = auth.uid()
        and u.is_active = true
        and ca.status in ('approved', 'in_review')
    )
  );

-- 4) Acces client legitime la ou il n'existait pas de policy cp_* : constats et
--    commentaires des missions explicitement accordees au contact client.
drop policy if exists "cp_findings_select" on public.assessment_findings;
create policy "cp_findings_select"
  on public.assessment_findings for select
  to authenticated
  using (
    public.is_client_role()
    and assessment_id in (
      select ca.id from public.control_assessments ca
      where ca.mission_id in (select public.get_my_client_mission_ids())
    )
  );

drop policy if exists "cp_comments_select" on public.comments;
create policy "cp_comments_select"
  on public.comments for select
  to authenticated
  using (
    public.is_client_role()
    and mission_id in (select public.get_my_client_mission_ids())
  );
