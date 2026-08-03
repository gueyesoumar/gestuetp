-- Migration 00166 (DOWN) : retire le vocabulaire par organisation.
drop function if exists public.my_vocab();
drop table if exists public.organization_vocab;
