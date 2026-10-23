-- Partie 3 : orgs de test + staff. REMPLACE les 5 UID (<CABO_UID> <CABA_UID> <REGA_UID> <REGS_UID> <ENT_UID>).
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/testing/sql/p3-orgs-staff.sql
do $$
declare
  v_cab uuid; v_reg uuid; v_ent uuid;
  perms_full jsonb := '{"can_create_mission":true,"can_assign_team":true,"can_be_lead":true,"can_designate_lead":true,"can_delete_mission":true,"can_manage_members":true,"can_manage_clients":true,"can_edit_organization":true,"can_manage_roles":true,"can_view_audit_trail":true,"can_manage_supervision_assignments":true,"can_manage_vendors":true,"can_manage_risk_criteria":true,"can_accept_risk":true}'::jsonb;
  perms_super jsonb := '{"can_create_mission":true,"can_manage_members":false,"can_manage_clients":false,"can_manage_supervision_assignments":false,"can_manage_vendors":false,"can_manage_risk_criteria":false,"can_view_audit_trail":true}'::jsonb;
  perms_auditeur jsonb := '{"can_create_mission":true,"can_assign_team":false,"can_be_lead":true,"can_manage_members":false,"can_manage_clients":false,"can_manage_roles":false,"can_view_audit_trail":true}'::jsonb;
begin
  -- Cabinet A (owner Associé + auditeur)
  insert into public.organizations (name, slug, types, is_active) values ('Cabinet Test A','cabinet-test-a',array['cabinet'],true) returning id into v_cab;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_cab,'Associé',true,perms_full);
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_cab,'Auditeur',false,perms_auditeur);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('2c7bd681-7ae3-4cc0-b881-12232107dc95',v_cab,'e2e-cabo@test.gestugroup.com','E2E','CabinetOwner',true);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('6312ea6d-64a8-45b8-a954-911a6e68d2b3',v_cab,'e2e-caba@test.gestugroup.com','E2E','CabinetAuditeur',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='2c7bd681-7ae3-4cc0-b881-12232107dc95' and r.organization_id=v_cab and r.name='Associé';
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='6312ea6d-64a8-45b8-a954-911a6e68d2b3' and r.organization_id=v_cab and r.name='Auditeur';

  -- Autorité R (Associé = admin + Superviseur)
  insert into public.organizations (name,slug,types,is_active) values ('Autorité de cybersécurité (test)','autorite-test',array['cabinet'],true) returning id into v_reg;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_reg,'Associé',true,perms_full);
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_reg,'Superviseur',false,perms_super);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('d9d434ba-abac-4f8b-a7f2-469b329745f7',v_reg,'e2e-rega@test.gestugroup.com','E2E','RegAdmin',true);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('9a448168-1adf-4a01-be19-6bdeb8437859',v_reg,'e2e-regs@test.gestugroup.com','E2E','RegSuperviseur',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='d9d434ba-abac-4f8b-a7f2-469b329745f7' and r.organization_id=v_reg and r.name='Associé';
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='9a448168-1adf-4a01-be19-6bdeb8437859' and r.organization_id=v_reg and r.name='Superviseur';

  -- Entreprise E
  insert into public.organizations (name,slug,types,is_active) values ('Entreprise Test E','entreprise-test-e',array['cabinet'],true) returning id into v_ent;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_ent,'Associé',true,perms_full);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('96f4b450-4498-4036-9113-fef88d696000',v_ent,'e2e-ent@test.gestugroup.com','E2E','Entreprise',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='96f4b450-4498-4036-9113-fef88d696000' and r.organization_id=v_ent and r.name='Associé';

  raise notice 'orgs: cabinet=% reg=% ent=%', v_cab, v_reg, v_ent;
end $$;
