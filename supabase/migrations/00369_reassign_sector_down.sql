-- 00369 (DOWN) - rollback RFC 0022 Lot 3 (désactivation guidée des secteurs).
drop function if exists public.reassign_sector(text, text);
drop function if exists public.get_sector_usage(text);
