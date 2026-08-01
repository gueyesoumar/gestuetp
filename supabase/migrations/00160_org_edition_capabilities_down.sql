-- Migration 00160 (DOWN) : retire la fondation edition/capacites.
--
-- Retire le SCHEMA ajoute par le up. NE PURGE PAS organization_capabilities : les
-- lignes posees par le backfill ne sont pas distinguables d'eventuelles capacites
-- posees a la main, et rien ne les gate -> les laisser est sans risque (et un
-- futur up les re-peuplera via on conflict do nothing). La table
-- organization_capabilities elle-meme reste (creee par 00156, pas par ici).

drop function if exists public.my_capabilities();
drop function if exists public.get_my_edition();
drop function if exists public.org_has_capability(uuid, public.org_capability);

alter table public.organizations drop column if exists edition;

drop policy if exists editions_select_all on public.editions;
drop table if exists public.editions;
