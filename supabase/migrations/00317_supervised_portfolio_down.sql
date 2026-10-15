-- Rollback 00317.
drop function if exists public.get_supervised_risks(uuid);
drop function if exists public.get_supervised_org_portfolio();
drop function if exists public.get_my_supervised_org_ids();
