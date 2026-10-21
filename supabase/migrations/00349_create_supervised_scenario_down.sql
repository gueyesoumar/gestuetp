-- 00349 (DOWN) - retire la RPC de creation cross-org.
drop function if exists public.create_supervised_scenario(uuid, text, text, int, int, text, text, text);
