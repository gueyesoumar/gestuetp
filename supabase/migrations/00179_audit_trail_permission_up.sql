-- 00179 — Piste d'audit (F6) : permission can_view_audit_trail.
--
-- Contrôle l'accès à la piste d'audit (activity_log). Les permissions sont des
-- clés jsonb dans platform_roles.permissions ; « exister » = être présente sur un
-- rôle. On l'attribue aux rôles ADMIN existants (ceux qui détiennent déjà
-- can_manage_roles). Les nouveaux cabinets l'obtiennent via le rôle par défaut
-- créé par l'Edge Function admin-create-cabinet (mise à jour en parallèle).

update public.platform_roles
set permissions = permissions || '{"can_view_audit_trail": true}'::jsonb
where coalesce((permissions->>'can_manage_roles')::boolean, false) = true;
