-- Migration 00158 (DOWN) : retrait de la primitive de traversée
drop function if exists public.my_related_org_ids(public.relationship_nature);
