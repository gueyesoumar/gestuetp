-- Rollback 00282 — retire les preuves NIST.
delete from public.evidence_catalog ec using public.controls c
where ec.control_id = c.id and ec.evidence_item_id is not null
  and c.domain_id in (select id from public.domains where framework_id = '00000000-0000-0000-0000-000000000011');
delete from public.evidence_items where framework_id = '00000000-0000-0000-0000-000000000011';
