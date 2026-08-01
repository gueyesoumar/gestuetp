-- Rollback 00137 : supprime la table de profil réglementaire des assujettis.
-- ATTENTION : perd les attributs OIV/non-OIV, régime, statut de périmètre.

drop policy if exists "erp_select_regulator" on public.entity_regulatory_profile;
drop trigger if exists trg_erp_updated_at on public.entity_regulatory_profile;
drop table if exists public.entity_regulatory_profile;
