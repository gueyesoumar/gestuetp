-- 00347 (DOWN) - retire la cle can_manage_vendors des permissions des platform_roles.
update public.platform_roles
set permissions = permissions - 'can_manage_vendors'
where permissions ? 'can_manage_vendors';
