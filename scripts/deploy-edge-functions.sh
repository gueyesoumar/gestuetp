#!/usr/bin/env bash
# Deploiement complet des edge functions ETP sur un projet Supabase.
#
# Usage : bash scripts/deploy-edge-functions.sh <project-ref>
#   prod (jibbl) : bash scripts/deploy-edge-functions.sh jibblzpownddlodzmewj
#   test (snayz) : bash scripts/deploy-edge-functions.sh snayznxraupndrdmhbak
#
# Deploie TOUTES les fonctions (verify_jwt active par defaut), puis re-deploie
# les fonctions PUBLIQUES en --no-verify-jwt (elles doivent etre joignables sans
# jeton utilisateur : rapports CSP, resolution de tenant a la connexion, liens
# email, callback CI). Les repasser en "jwt requis" casserait connexion/branding.
#
# Idempotent : re-jouable sans risque. Ne gere PAS les secrets (a poser separement
# par environnement : ANTHROPIC_API_KEY, PROBATIVE_TSA_URL, etc.).
set -euo pipefail

REF="${1:?usage: bash scripts/deploy-edge-functions.sh <project-ref>}"

# Fonctions publiques (aucune auth utilisateur dans le code -> verify_jwt=false).
PUBLIC_FNS=(csp-report resolve-tenant-by-hostname email-preferences feasibility-callback)

# Retry avec backoff : le bundling importe les deps depuis esm.sh, qui renvoie
# régulièrement un 522 transitoire (CDN timeout) et fait échouer un déploiement
# par ailleurs valide. On retente jusqu'à 3 fois (10s, 20s) avant d'abandonner.
retry() {
  local n=1 max=3
  until "$@"; do
    if [ "$n" -ge "$max" ]; then
      echo ">> échec après $max tentatives : $*" >&2
      return 1
    fi
    echo ">> échec (tentative $n/$max) — probable 522 esm.sh, nouvelle tentative dans $((n * 10))s…" >&2
    sleep "$((n * 10))"
    n=$((n + 1))
  done
}

echo ">> [$REF] Deploiement de TOUTES les fonctions (jeton requis par defaut)..."
retry supabase functions deploy --project-ref "$REF"

echo ">> [$REF] Re-deploiement des fonctions publiques (--no-verify-jwt)..."
for fn in "${PUBLIC_FNS[@]}"; do
  echo "   - $fn"
  retry supabase functions deploy "$fn" --no-verify-jwt --project-ref "$REF"
done

echo ">> [$REF] Termine."
