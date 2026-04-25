-- Migration 00064: Préférences email par utilisateur (DOWN)

DROP TRIGGER IF EXISTS trg_create_email_preferences ON public.users;
DROP FUNCTION IF EXISTS public.create_email_preferences_for_user();
DROP TABLE IF EXISTS public.email_preferences;
