-- Migration 00162 (DOWN) : retire la primitive compat (aucune policy ne l'utilise à ce stade).
drop function if exists public.visible_target_ids();
