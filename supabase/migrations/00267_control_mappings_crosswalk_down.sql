-- Rollback 00267 — retire le crosswalk intra-ISO 27001 + la contrainte de valeurs.

-- Supprime uniquement les paires intra-ISO seedées par 00267 (les deux contrôles ISO 27001).
delete from public.control_mappings cm
using public.controls cs, public.domains dsrc, public.controls ct, public.domains dtgt
where cm.source_control_id = cs.id and cs.domain_id = dsrc.id
  and cm.target_control_id = ct.id and ct.domain_id = dtgt.id
  and dsrc.framework_id = '00000000-0000-0000-0000-000000000010'
  and dtgt.framework_id = '00000000-0000-0000-0000-000000000010';

alter table public.control_mappings
  drop constraint if exists chk_control_mappings_relationship;
