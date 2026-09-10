-- Rollback : retire la fonction de restriction d'accès par domaine.
drop function if exists public.user_belongs_to_cabinet(uuid);
