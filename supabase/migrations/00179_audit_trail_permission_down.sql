-- 00179 — DOWN : retire la permission can_view_audit_trail de tous les rôles.

update public.platform_roles
set permissions = permissions - 'can_view_audit_trail';
