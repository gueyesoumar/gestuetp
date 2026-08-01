-- 00130 — Rollback : restaure la policy UPDATE d'origine (demandeur / platform owner).

drop policy if exists support_requests_update on public.support_requests;

create policy support_requests_update on public.support_requests
  for update
  using (
    public.is_platform_owner()
    or requester_user_id = public.get_my_user_id()
  );
