-- Restriction d'accès par domaine marque blanche : détermine si l'utilisateur
-- courant (auth.uid()) appartient au cabinet dont l'organization id = p_cabinet_id.
-- Utilisé par TenantAccessGuard côté frontend pour couper une session ouverte
-- depuis le mauvais portail cabinet. Les données restent cloisonnées par RLS ;
-- ceci ajoute la cohérence d'accès au portail.
--
-- Rattachement (cf. modèle) :
--   super-admin (is_platform_owner) : autorisé partout (support)
--   staff  (role='auditor') : users.organization_id = cabinet
--   client (role='client')  : users.organization_id = cabinet (cabinet d'origine)
--                              OU accès mission effectif sous ce cabinet (multi-cabinets)
--
-- SECURITY DEFINER (lit users/contacts/missions hors RLS) ; appelée en RPC,
-- jamais depuis une policy → pas de récursion RLS.

create or replace function public.user_belongs_to_cabinet(p_cabinet_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_id = auth.uid()
      and u.is_active = true
      and (
        u.is_platform_owner = true
        or (u.role = 'auditor' and u.organization_id = p_cabinet_id)
        or (u.role = 'client' and u.organization_id = p_cabinet_id)
        or (
          u.role = 'client'
          and exists (
            select 1
            from public.client_portal_contacts cpc
            join public.client_mission_access cma on cma.contact_id = cpc.id
            join public.missions m on m.id = cma.mission_id
            where cpc.user_id = u.id
              and m.cabinet_id = p_cabinet_id
          )
        )
      )
  );
$$;

grant execute on function public.user_belongs_to_cabinet(uuid) to authenticated;
