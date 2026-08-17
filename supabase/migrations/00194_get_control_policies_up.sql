-- 00194 — Policy-as-Evidence cross-tenant (raffinement A, RFC 0005).
--
-- Surface les politiques liées à un contrôle comme preuve candidate, y compris
-- celles de l'organisation AUDITÉE quand un cabinet ≠ audité travaille sur une
-- mission. Frontière d'autorisation UNIQUE (secure by default) : la fonction est
-- le seul chemin cross-tenant ; aucune RLS de table n'est élargie (zéro effet de
-- bord sur les autres requêtes). SECURITY DEFINER, lecture seule, gardes internes :
--   - AAL2 requis (cohérent avec les policies RESTRICTIVE de Policy/Risk)
--   - jamais pour un rôle client (chemins cp_* dédiés)
--   - périmètre = MON org (auto-audit) OU orgs dont je suis l'auditeur via une
--     mission où je suis membre (cabinet_id = mon org).

create or replace function public.get_control_policies(p_control_id uuid)
returns table (policy_id uuid, title text, status text, applied boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.title, p.status::text,
    exists (
      select 1 from public.policy_effectiveness_attestations e
      where e.policy_id = p.id and e.status = 'applied'
    ) as applied
  from public.policy_control_links pcl
  join public.policies p on p.id = pcl.policy_id
  where pcl.control_id = p_control_id
    and public.is_aal2()
    and not public.is_client_role()
    and (
      pcl.organization_id = public.get_my_organization_id()
      -- Orgs auditées : uniquement via une mission ACTIVE dont je suis membre et
      -- dont mon org est le cabinet (m.is_active → coupe l'accès résiduel à la
      -- clôture, moindre privilège). La visibilité est org-relationnelle par
      -- design (une politique est un actif org-scoped) — pas de granularité par
      -- contrôle/mission ici ; c'est intra-cabinet, sans fuite de tenant.
      or pcl.organization_id in (
        select m.client_id
        from public.missions m
        join public.mission_members mm on mm.mission_id = m.id
        where m.cabinet_id = public.get_my_organization_id()
          and mm.user_id = public.get_my_user_id()
          and m.is_active = true
      )
    );
$$;

revoke all on function public.get_control_policies(uuid) from public;
grant execute on function public.get_control_policies(uuid) to authenticated;
