-- Rollback 00281 — retire les constats-types NIST.
delete from public.finding_templates ft using public.controls c
where ft.control_id = c.id and ft.scope = 'platform'
  and c.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000011');
