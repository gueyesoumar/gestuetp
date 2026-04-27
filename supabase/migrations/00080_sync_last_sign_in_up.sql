-- Migration 00080: Sync auth.users.last_sign_in_at vers public.users — UP
-- Description: La colonne public.users.last_sign_in_at existe depuis la
-- migration 00003 mais rien ne la met à jour. Supabase Auth incrémente
-- auth.users.last_sign_in_at à chaque login mais ne touche pas à public.users.
-- Conséquence : la console super-admin affiche "jamais connecté" pour tout
-- le monde, et les statistiques "users actifs sur 30j" sont fausses.
--
-- Fix : un trigger sur auth.users qui propage le timestamp vers public.users
-- + un backfill des données déjà présentes.

CREATE OR REPLACE FUNCTION public.sync_users_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.users
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE auth_id = NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_users_last_sign_in() IS 'Propage auth.users.last_sign_in_at vers public.users. Déclenché par trigger sur UPDATE OF last_sign_in_at.';

DROP TRIGGER IF EXISTS trg_sync_users_last_sign_in ON auth.users;

CREATE TRIGGER trg_sync_users_last_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION public.sync_users_last_sign_in();

-- Backfill : copie le dernier login déjà connu d'auth pour les users existants
UPDATE public.users u
SET last_sign_in_at = a.last_sign_in_at
FROM auth.users a
WHERE u.auth_id = a.id
  AND a.last_sign_in_at IS NOT NULL
  AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at < a.last_sign_in_at);
