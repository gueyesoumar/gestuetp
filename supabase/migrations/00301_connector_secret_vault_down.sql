-- Rollback P1.3 (coffre). Les secrets Vault déjà créés ne sont PAS supprimés ici
-- (pas de perte silencieuse) ; les retirer manuellement si besoin via vault.
drop function if exists public.connector_secret_read(uuid);
drop function if exists public.connector_secret_store(uuid, text, jsonb);
