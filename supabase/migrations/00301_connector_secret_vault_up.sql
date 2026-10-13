-- P1.3 (RFC 0014 §6) : coffre des secrets de connecteur. Les identifiants d'un
-- connecteur (clés API Tenable, tokens OAuth...) vivent CHIFFRÉS dans Supabase Vault.
-- Seules ces deux fonctions SECURITY DEFINER, réservées au service_role (edges), y
-- accèdent. Aucun secret n'est jamais stocké en clair ni lisible par authenticated.
-- Vault est déjà utilisé sur le projet (mig 00154).

-- Stocke (ou met à jour) un payload JSON et renvoie l'id Vault à placer dans
-- connector_integrations.secret_ref. search_path vide + objets qualifiés (bonne
-- pratique SECURITY DEFINER : pas d'injection via search_path).
create or replace function public.connector_secret_store(p_org uuid, p_provider text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := 'connector_' || p_provider || '_' || p_org::text;
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then
    v_id := vault.create_secret(p_payload::text, v_name, 'Connecteur ' || p_provider);
  else
    perform vault.update_secret(v_id, p_payload::text);
  end if;
  return v_id;
end;
$$;

-- Lit et déchiffre le payload d'un secret de connecteur (null si absent).
create or replace function public.connector_secret_read(p_secret_ref uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where id = p_secret_ref;
  if v_secret is null then return null; end if;
  return v_secret::jsonb;
end;
$$;

-- Réservé au service_role (edges). On retire le grant public par défaut.
revoke all on function public.connector_secret_store(uuid, text, jsonb) from public;
revoke all on function public.connector_secret_read(uuid) from public;
grant execute on function public.connector_secret_store(uuid, text, jsonb) to service_role;
grant execute on function public.connector_secret_read(uuid) to service_role;
