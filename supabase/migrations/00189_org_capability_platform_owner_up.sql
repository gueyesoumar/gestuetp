-- 00189 — Le super-admin peut LIRE les capacités d'une org (carte Modules du
-- détail organisation). organization_capabilities n'avait que `org_cap_select_own`
-- (chaque org lit les siennes) ; on ajoute la lecture platform-owner, calquée sur
-- les policies 00120. Écritures : toujours service_role (Edge admin-set-org-capability).

create policy "org_cap_select_platform_owner"
  on public.organization_capabilities for select
  to authenticated
  using (public.is_platform_owner());
