-- Rollback P3 GitHub : retire preuves puis checks (evidence_results.check_id est
-- on delete restrict → purger les preuves d'abord). Intégrations laissées en place.
delete from public.evidence_results
  where check_id in (select id from public.control_checks where provider = 'github');
delete from public.control_checks where provider = 'github';
