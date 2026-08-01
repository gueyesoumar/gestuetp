-- 00129 — Rollback du module Centre d'aide (Phase 0).

drop policy if exists support_requests_delete on public.support_requests;
drop policy if exists support_requests_update on public.support_requests;
drop policy if exists support_requests_insert on public.support_requests;
drop policy if exists support_requests_select on public.support_requests;

drop trigger if exists trg_support_requests_updated_at on public.support_requests;

drop table if exists public.support_requests;

drop type if exists support_status;
drop type if exists support_nature;

-- Note : on ne supprime PAS public.is_platform_owner() au rollback — il peut etre
-- reutilise par d'autres policies. Le retirer manuellement s'il n'est plus reference.
