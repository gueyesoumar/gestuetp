-- Migration: Fonctions helper SECURITY DEFINER pour les policies RLS (UP)
-- Evite la recursion infinie quand une policy sur une table reference cette meme table

-- Retourne l'organization_id de l'utilisateur courant
create or replace function public.get_my_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.users
  where auth_id = auth.uid()
    and is_active = true
  limit 1;
$$;

-- Retourne l'id (public.users.id) de l'utilisateur courant
create or replace function public.get_my_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_id = auth.uid()
    and is_active = true
  limit 1;
$$;

comment on function public.get_my_organization_id() is 'SECURITY DEFINER — retourne l''organization_id du user courant sans declencher les policies RLS sur users';
comment on function public.get_my_user_id() is 'SECURITY DEFINER — retourne l''id public.users du user courant sans declencher les policies RLS sur users';
