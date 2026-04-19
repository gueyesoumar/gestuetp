-- Seed: Utilisateur de test pour le developpement
-- Email: admin@gestudemo.com / Mot de passe: GestuDemo2026!
--
-- IMPORTANT: executer en tant que postgres (pas anon/authenticated)
-- Ce script cree un utilisateur dans auth.users ET dans public.users

-- 1. Creer l'utilisateur dans auth.users
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token
)
values (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '00000000-0000-0000-0000-000000000000',
  'admin@gestudemo.com',
  crypt('GestuDemo2026!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Oumar", "last_name": "Gueye"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  ''
);

-- 2. Creer l'identite liee (necessaire pour le login email/password)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '{"sub": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "email": "admin@gestudemo.com"}',
  'email',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  now(),
  now(),
  now()
);

-- 3. Creer le profil dans public.users (lie au cabinet demo)
insert into public.users (
  id,
  auth_id,
  organization_id,
  email,
  first_name,
  last_name,
  job_title
)
values (
  'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '00000000-0000-0000-0000-000000000001',
  'admin@gestudemo.com',
  'Oumar',
  'Gueye',
  'Associé'
);

-- 4. Attribuer le role Associe au user de test
insert into public.user_platform_roles (user_id, platform_role_id)
select
  'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
  pr.id
from public.platform_roles pr
where pr.organization_id = '00000000-0000-0000-0000-000000000001'
  and pr.name = 'Associé';
