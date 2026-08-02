#!/usr/bin/env bash
# =============================================================================
# Runner de migrations Gëstu ETP — applique les `NNNNN_nom_up.sql` en attente sur
# une base, de façon idempotente et ordonnée, en suivant l'état dans `ops.migrations`.
#
# Convention projet : supabase/migrations/NNNNN_nom_up.sql (+ _down.sql pour le
# rollback manuel, ignoré ici). Chaque migration est appliquée dans UNE transaction
# (atomique) — vérifié : aucune migration non-transactionnelle (add value/concurrently).
#
# Usage :
#   DATABASE_URL='postgresql://…' bash scripts/migrate.sh            # applique les manquantes
#   DATABASE_URL='postgresql://…' bash scripts/migrate.sh --baseline # marque TOUT comme appliqué SANS exécuter
#   DATABASE_URL='postgresql://…' bash scripts/migrate.sh --dry-run  # liste les manquantes, n'applique rien
#
# --baseline : pour une base qui a DÉJÀ le schéma (prod jibbl, ou test chargé depuis
#   un dump) — enregistre les versions présentes sans rejouer le SQL.
# =============================================================================
set -euo pipefail

MODE="apply"
case "${1:-}" in
  --baseline) MODE="baseline" ;;
  --dry-run)  MODE="dry-run" ;;
  "")         MODE="apply" ;;
  *) echo "Option inconnue: $1 (attendu: --baseline | --dry-run | rien)"; exit 2 ;;
esac

: "${DATABASE_URL:?DATABASE_URL manquant (chaîne de connexion Postgres)}"
command -v psql >/dev/null || { echo "psql requis"; exit 1; }

MIG_DIR="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations"
[ -d "$MIG_DIR" ] || { echo "Dossier introuvable: $MIG_DIR"; exit 1; }

# Table de suivi dans le schéma `ops` (non exposé par PostgREST → invisible côté API).
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists ops;
create table if not exists ops.migrations (
  version    text primary key,
  name       text not null,
  applied_at timestamptz not null default now()
);
SQL

applied_count=0
pending_count=0

for f in "$MIG_DIR"/*_up.sql; do
  [ -e "$f" ] || { echo "Aucune migration trouvée."; break; }
  base="$(basename "$f" _up.sql)"   # 00164_org_graph_sync
  version="${base%%_*}"              # 00164
  name="${base#*_}"                  # org_graph_sync

  already="$(psql "$DATABASE_URL" -tA -c "select 1 from ops.migrations where version = '$version'")"
  if [ "$already" = "1" ]; then
    continue
  fi
  pending_count=$((pending_count + 1))

  case "$MODE" in
    dry-run)
      echo "  à appliquer : $version ($name)"
      ;;
    baseline)
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
        -c "insert into ops.migrations(version, name) values ('$version', '$name')"
      echo "  baseline    : $version ($name)"
      applied_count=$((applied_count + 1))
      ;;
    apply)
      echo "  application : $version ($name)…"
      # --single-transaction : migration + enregistrement commitent ensemble (atomique).
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q --single-transaction \
        -f "$f" \
        -c "insert into ops.migrations(version, name) values ('$version', '$name')"
      applied_count=$((applied_count + 1))
      ;;
  esac
done

echo ""
case "$MODE" in
  dry-run)  echo "✓ dry-run : $pending_count migration(s) en attente." ;;
  baseline) echo "✓ baseline : $applied_count version(s) marquée(s) appliquée(s) (aucun SQL exécuté)." ;;
  apply)    echo "✓ terminé : $applied_count migration(s) appliquée(s)." ;;
esac
