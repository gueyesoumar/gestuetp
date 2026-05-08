-- Migration: pv_template_backfill (DOWN)
-- Rollback de 00116_pv_template_backfill_up.sql
--
-- IMPOSSIBLE de réverser proprement le backfill : les pv_template recalculés
-- remplacent les états vides/null antérieurs. Nuller les pv_template ferait
-- aussi perdre les bons templates créés entre temps.
--
-- Ce DOWN est volontairement no-op. Si un rollback strict est nécessaire,
-- restaurer depuis un backup PostgreSQL antérieur à la migration.

select 1;
