-- Migration 00157 (DOWN) : rollback du backfill (RFC 0001, étape 2)
-- Le backfill suit immédiatement l'étape 1 : aucune arête manuelle n'existe encore.
-- On vide donc le graphe et on délie les missions.
-- ⚠️ À NE PAS exécuter si des arêtes ont été créées manuellement depuis (sinon
--    elles seraient perdues) — dans la séquence de migration, ce n'est pas le cas.

update public.missions set engagement_id = null;

delete from public.organization_capabilities;
delete from public.organization_relationships;
