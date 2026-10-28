-- 00368 (DOWN) - rollback RFC 0022 Lot 1 (socle secteurs paramétrables).
drop function if exists public.get_sectors(boolean);

update public.platform_roles
set permissions = permissions - 'can_manage_sectors'
where permissions ? 'can_manage_sectors';

drop table if exists public.org_sectors cascade;
