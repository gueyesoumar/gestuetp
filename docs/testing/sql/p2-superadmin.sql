-- Partie 2 : super-admin (platform owner). REMPLACE <SA_UID> par l'UID du compte e2e-sa.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/testing/sql/p2-superadmin.sql
do $$
declare v_org uuid; v_role uuid; v_user uuid;
  v_auth_id uuid := '4af87e38-42d4-4d76-ae63-01ebb9153a62';
begin
  insert into public.organizations (name, slug, types, is_active, plan_id)
  values ('Gëstu (test éditeur)', 'gestu-test', array['platform'], true, null) returning id into v_org;
  insert into public.platform_roles (organization_id, name, description, is_default, permissions)
  values (v_org, 'Associé', 'Rôle test super-admin', true,
    '{"can_create_mission":true,"can_assign_team":true,"can_be_lead":true,"can_designate_lead":true,"can_delete_mission":true,"can_manage_members":true,"can_manage_clients":true,"can_edit_organization":true,"can_manage_roles":true,"can_view_audit_trail":true,"can_manage_supervision_assignments":true,"can_manage_vendors":true,"can_manage_risk_criteria":true,"can_accept_risk":true}'::jsonb)
  returning id into v_role;
  insert into public.users (auth_id, organization_id, email, first_name, last_name, is_active, is_platform_owner)
  values (v_auth_id, v_org, 'e2e-sa@test.gestugroup.com', 'E2E', 'SuperAdmin', true, true) returning id into v_user;
  insert into public.user_platform_roles (user_id, platform_role_id, assigned_by) values (v_user, v_role, null);
  raise notice 'SA ok org=% user=%', v_org, v_user;
end $$;
