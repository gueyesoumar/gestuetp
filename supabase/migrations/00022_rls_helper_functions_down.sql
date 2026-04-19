-- Migration: Fonctions helper SECURITY DEFINER (DOWN)

drop function if exists public.get_my_organization_id();
drop function if exists public.get_my_user_id();
