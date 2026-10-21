-- 00346 (DOWN) - retire le referentiel PASI (controles + domaines + framework).
delete from public.controls where domain_id in (
  select id from public.domains where framework_id = '00000000-0000-0000-00a5-000000000000'
);
delete from public.domains where framework_id = '00000000-0000-0000-00a5-000000000000';
delete from public.frameworks where id = '00000000-0000-0000-00a5-000000000000';
