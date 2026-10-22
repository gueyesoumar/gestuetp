-- Partie 5c : auto-évaluation fournisseur (statut self_assessment) pour Fournisseur F
-- sur le référentiel PASI, afin que VEN ait une évaluation à remplir dans le portail.
-- PRÊT (aucun placeholder). À lancer APRÈS p5a (fournisseur + arête supplier) et la mig 00346 (PASI).
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/testing/sql/p5c-vendor-self-assessment.sql
do $$
declare
  v_rel uuid := (select r.id from public.organization_relationships r
                 join public.organizations o on o.id = r.target_org_id
                 where r.nature = 'supplier' and r.status = 'active' and o.slug = 'fournisseur-test-f' limit 1);
  v_fw  uuid := (select id from public.frameworks where slug = 'pasi');
  v_sa  uuid := (select id from public.users where email = 'e2e-rega@test.gestugroup.com');
  v_asmt uuid;
begin
  if v_rel is null then raise exception 'Arête supplier Fournisseur F introuvable : lance p5a.'; end if;
  if v_fw  is null then raise exception 'Référentiel PASI introuvable (migration 00346 appliquée ?).'; end if;

  select id into v_asmt from public.vendor_assessment where relationship_id = v_rel and framework_id = v_fw limit 1;
  if v_asmt is null then
    insert into public.vendor_assessment (relationship_id, framework_id, status, created_by)
      values (v_rel, v_fw, 'self_assessment', v_sa) returning id into v_asmt;
    insert into public.vendor_control_evaluation (vendor_assessment_id, control_id)
      select v_asmt, c.id from public.controls c join public.domains d on d.id = c.domain_id where d.framework_id = v_fw;
  else
    update public.vendor_assessment set status = 'self_assessment', updated_at = now() where id = v_asmt;
  end if;

  raise notice 'vendor self-assessment ok: assessment=% controles=%', v_asmt,
    (select count(*) from public.vendor_control_evaluation where vendor_assessment_id = v_asmt);
end $$;
