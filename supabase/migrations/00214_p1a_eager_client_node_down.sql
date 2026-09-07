-- Migration 00214 (DOWN) — P1a (RFC 0007).
-- Cette migration est un BACKFILL de données purement ADDITIF (nœuds
-- organisations + arêtes audit_engagement). Elle n'est PAS proprement
-- réversible : les organisations matérialisées peuvent depuis être référencées
-- par des missions (missions.client_id NOT NULL ... on delete restrict), des
-- portails clients, des évaluations, etc. Les supprimer casserait ces liens.
--
-- Le rollback est donc un NO-OP volontaire : les nœuds et arêtes créés restent
-- en place (ils sont cohérents avec le modèle cible et inoffensifs pour le code
-- legacy, qui continue de lire cabinet_clients). Aucune structure n'ayant été
-- modifiée, il n'y a rien à défaire côté schéma.

select 1;
