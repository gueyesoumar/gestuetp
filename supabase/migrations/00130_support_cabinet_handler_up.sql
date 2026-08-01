-- 00130 — File support cote cabinet : un gestionnaire du cabinet (can_manage_members)
-- peut traiter (changer le statut) les demandes de SON cabinet, pas seulement le
-- demandeur ou le platform owner. Reutilise has_cabinet_permission() (mig. 00082).
-- Aucune sous-requete sur support_requests -> pas de recursion.

drop policy if exists support_requests_update on public.support_requests;

create policy support_requests_update on public.support_requests
  for update
  using (
    public.is_platform_owner()
    or requester_user_id = public.get_my_user_id()
    or (
      cabinet_id = public.get_my_organization_id()
      and public.has_cabinet_permission('can_manage_members')
    )
  );
