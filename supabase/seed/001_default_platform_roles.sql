-- Seed: Roles plateforme par defaut
-- Ces roles sont inseres comme templates (organization_id sera remplace a la creation d'un cabinet)
-- Pour le dev, on cree d'abord une organisation de test

-- Organisation de test (cabinet)
insert into public.organizations (id, name, slug, types)
values (
  '00000000-0000-0000-0000-000000000001',
  'Cabinet Demo',
  'cabinet-demo',
  '{"cabinet"}'
);

-- Organisation de test (client)
insert into public.organizations (id, name, slug, types)
values (
  '00000000-0000-0000-0000-000000000002',
  'Client Demo SA',
  'client-demo',
  '{"client"}'
);

-- Tenant config pour le cabinet demo
insert into public.tenant_configs (organization_id, display_name, primary_color, secondary_color)
values (
  '00000000-0000-0000-0000-000000000001',
  'Cabinet Demo',
  '#1E40AF',
  '#3B82F6'
);

-- Roles plateforme par defaut pour le cabinet demo
insert into public.platform_roles (organization_id, name, description, permissions, is_default) values
(
  '00000000-0000-0000-0000-000000000001',
  'Associé',
  'Validateur ultime, tous les droits',
  '{"can_create_mission": true, "can_assign_team": true, "can_be_lead": true, "can_designate_lead": true}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Sénior Manager',
  'Gestion de missions et equipes',
  '{"can_create_mission": true, "can_assign_team": true, "can_be_lead": true, "can_designate_lead": true}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Manager',
  'Gestion de missions, ne peut pas designer de chef de mission',
  '{"can_create_mission": true, "can_assign_team": true, "can_be_lead": true, "can_designate_lead": false}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Sénior',
  'Peut etre chef de mission',
  '{"can_create_mission": false, "can_assign_team": false, "can_be_lead": true, "can_designate_lead": false}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Junior',
  'Auditeur debutant, droits limites',
  '{"can_create_mission": false, "can_assign_team": false, "can_be_lead": false, "can_designate_lead": false}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Consultant Externe',
  'Intervenant externe, droits limites',
  '{"can_create_mission": false, "can_assign_team": false, "can_be_lead": false, "can_designate_lead": false}',
  true
);
