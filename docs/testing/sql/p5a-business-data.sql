-- Partie 5a : données métier (assujettis + fournisseur + risques + directive + affectation).
-- PRÊT (aucun placeholder). À lancer APRÈS p3 (orgs) et p4 (capacités).
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/testing/sql/p5a-business-data.sql
do $$
declare
  v_reg   uuid := (select id from public.organizations where slug='autorite-test');
  v_sa    uuid := (select id from public.users where email='e2e-rega@test.gestugroup.com');   -- créateur = REG-A
  v_regs  uuid := (select id from public.users where email='e2e-regs@test.gestugroup.com');
  v_douanes uuid; v_sante uuid; v_four uuid; v_rel_four uuid; v_sc uuid;
begin
  if v_reg is null then raise exception 'Autorité R introuvable : lance p3 d''abord.'; end if;

  -- Assujetti 1 : Douanes (IIC = criticality eleve)
  insert into public.organizations (name,slug,is_active) values ('Direction Générale des Douanes (test)','douanes-test',true)
    on conflict (slug) do update set name=excluded.name returning id into v_douanes;
  insert into public.organization_relationships (actor_org_id,target_org_id,nature,status,created_by)
    values (v_reg,v_douanes,'regulatory_supervision','active',v_sa) on conflict do nothing;
  insert into public.entity_regulatory_profile (organization_id,criticality,status)
    values (v_douanes,'eleve','active') on conflict (organization_id) do update set criticality='eleve';

  -- Assujetti 2 : Santé (standard)
  insert into public.organizations (name,slug,is_active) values ('Ministère de la Santé (test)','sante-test',true)
    on conflict (slug) do update set name=excluded.name returning id into v_sante;
  insert into public.organization_relationships (actor_org_id,target_org_id,nature,status,created_by)
    values (v_reg,v_sante,'regulatory_supervision','active',v_sa) on conflict do nothing;
  insert into public.entity_regulatory_profile (organization_id,criticality,status)
    values (v_sante,'standard','active') on conflict (organization_id) do update set criticality='standard';

  -- Fournisseur F + arête supplier + profil (RFC 0007 : pas de types[])
  insert into public.organizations (name,slug,is_active) values ('Fournisseur Test F','fournisseur-test-f',true)
    on conflict (slug) do update set name=excluded.name returning id into v_four;
  insert into public.organization_relationships (actor_org_id,target_org_id,nature,status,created_by)
    values (v_reg,v_four,'supplier','active',v_sa) on conflict do nothing;
  select id into v_rel_four from public.organization_relationships
    where actor_org_id=v_reg and target_org_id=v_four and nature='supplier' and status='active' limit 1;
  insert into public.vendor_relationship_profile (relationship_id,data_access_level,criticality,services,created_by)
    values (v_rel_four,'etendu','eleve','Infogérance du SI',v_sa) on conflict (relationship_id) do nothing;

  -- Risques sur Douanes : 1 hors seuil + revue en retard, 1 autre
  insert into public.risk_scenarios (organization_id,title,dimension,inherent_likelihood,inherent_impact,treatment,source,created_by,next_review_at)
    values (v_douanes,'Rançongiciel sur le SI douanier','security',4,4,'untreated','self',v_sa, current_date - 10)
    returning id into v_sc;
  insert into public.risk_scenarios (organization_id,title,dimension,inherent_likelihood,inherent_impact,treatment,source,created_by,next_review_at)
    values (v_douanes,'Fuite de données des contribuables','data_protection',3,4,'reduce','self',v_sa, current_date + 60);

  -- Directive du régulateur à Douanes (boucle portail CLI)
  insert into public.risk_treatment_actions (organization_id,risk_scenario_id,description,option,origin,requested_by,created_by,status)
    values (v_douanes,v_sc,'Déployer la MFA sur les comptes à privilèges','reduce','supervisor_directive',v_sa,v_sa,'todo');

  -- Affectation REG-S -> Douanes uniquement (scoping strict)
  insert into public.supervision_assignments (regulator_org_id,assignee_user_id,scope_type,scope_org_id)
    values (v_reg,v_regs,'org',v_douanes) on conflict do nothing;

  raise notice 'metier ok: douanes=% sante=% fournisseur=% rel_supplier=%', v_douanes, v_sante, v_four, v_rel_four;
end $$;
