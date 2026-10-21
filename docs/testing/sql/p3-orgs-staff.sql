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
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<CABO_UID>',v_cab,'e2e-cabo@test.gestugroup.com','E2E','CabinetOwner',true);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<CABA_UID>',v_cab,'e2e-caba@test.gestugroup.com','E2E','CabinetAuditeur',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<CABO_UID>' and r.organization_id=v_cab and r.name='Associé';
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<CABA_UID>' and r.organization_id=v_cab and r.name='Auditeur';

  -- Autorité R (Associé = admin + Superviseur)
  insert into public.organizations (name,slug,types,is_active) values ('Autorité de cybersécurité (test)','autorite-test',array['cabinet'],true) returning id into v_reg;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_reg,'Associé',true,perms_full);
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_reg,'Superviseur',false,perms_super);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<REGA_UID>',v_reg,'e2e-rega@test.gestugroup.com','E2E','RegAdmin',true);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<REGS_UID>',v_reg,'e2e-regs@test.gestugroup.com','E2E','RegSuperviseur',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<REGA_UID>' and r.organization_id=v_reg and r.name='Associé';
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<REGS_UID>' and r.organization_id=v_reg and r.name='Superviseur';

  -- Entreprise E
  insert into public.organizations (name,slug,types,is_active) values ('Entreprise Test E','entreprise-test-e',array['cabinet'],true) returning id into v_ent;
  insert into public.platform_roles (organization_id,name,is_default,permissions) values (v_ent,'Associé',true,perms_full);
  insert into public.users (auth_id,organization_id,email,first_name,last_name,is_active) values ('<ENT_UID>',v_ent,'e2e-ent@test.gestugroup.com','E2E','Entreprise',true);
  insert into public.user_platform_roles (user_id,platform_role_id) select u.id,r.id from public.users u,public.platform_roles r where u.auth_id='<ENT_UID>' and r.organization_id=v_ent and r.name='Associé';

  raise notice 'orgs: cabinet=% reg=% ent=%', v_cab, v_reg, v_ent;
end $$;
