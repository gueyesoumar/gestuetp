-- Rollback 00271 — retire les constats-types PSSI-ES générés (couverture complète).
delete from public.finding_templates ft
using public.controls c
where ft.control_id = c.id
  and ft.scope = 'platform'
  and ft.classification = 'minor_nc'
  and ft.description like 'Non-conformité à l''exigence %'
  and c.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000017');
