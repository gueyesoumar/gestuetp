-- Migration 00080: Sync auth.users.last_sign_in_at vers public.users — DOWN

DROP TRIGGER IF EXISTS trg_sync_users_last_sign_in ON auth.users;
DROP FUNCTION IF EXISTS public.sync_users_last_sign_in();
