#!/usr/bin/env bash
# =============================================================================
# Seed de démo Régul (DCSSI) — provisionne un parc d'assujettis + mesures +
# incidents sur l'instance jibbl, en agissant comme l'admin régulateur.
#
# Prérequis :
#   - Tenant régulateur bootstrappé (org DCSSI edition=regul, admin connectable).
#   - Migration 00164 appliquée (le trigger pose l'arête de supervision à la
#     création de chaque assujetti -> visible_target_ids/RLS les voit).
#
# Usage :
#   export SUPABASE_URL='https://jibblzpownddlodzmewj.supabase.co'
#   export SUPABASE_ANON_KEY='...'            # anon key jibbl (Settings > API)
#   export REGUL_ADMIN_EMAIL='admin@dcssi.sn'
#   export REGUL_ADMIN_PASSWORD='...'         # mot de passe posé au Dashboard
#   bash scripts/seed-regul-demo.sh
#
# À lancer UNE FOIS (slug d'org unique -> relancer créerait des doublons/erreurs).
# =============================================================================
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL manquant}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY manquant}"
: "${REGUL_ADMIN_EMAIL:?REGUL_ADMIN_EMAIL manquant}"
: "${REGUL_ADMIN_PASSWORD:?REGUL_ADMIN_PASSWORD manquant}"
command -v jq >/dev/null || { echo "jq requis (brew install jq)"; exit 1; }

API="$SUPABASE_URL/functions/v1"

echo "→ Connexion admin régulateur ($REGUL_ADMIN_EMAIL)…"
TOKEN=$(curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "$(jq -n --arg e "$REGUL_ADMIN_EMAIL" --arg p "$REGUL_ADMIN_PASSWORD" \
        '{email:$e,password:$p}')" | jq -r '.access_token // empty')
[ -n "$TOKEN" ] || { echo "✗ Échec authentification (email/mot de passe ?)"; exit 1; }
echo "✓ Authentifié"

# invoke <function> <json-payload>  -> imprime la réponse JSON
invoke() {
  curl -s "$API/$1" \
    -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" -d "$2"
}

# --- 1) Assujettis : name|entity_type|sector|city|criticality|obligation_regime|tier
ASSUJETTIS=(
  "Sénégal Numérique SA|filiale|Infrastructure numérique de l'État|Dakar|eleve|OIV|1"
  "Direction Générale des Impôts et Domaines|filiale|Fiscalité|Dakar|eleve|OIV|1"
  "Ministère de la Santé et de l'Action sociale|filiale|Santé publique|Dakar|eleve|OSE|1"
  "Direction Générale des Douanes|filiale|Douanes|Dakar|eleve|OIV|1"
  "Caisse de Sécurité Sociale|filiale|Protection sociale|Dakar|standard|OSE|2"
  "Agence Nationale de la Statistique et de la Démographie|filiale|Statistique nationale|Dakar|standard|OSE|2"
)

declare -a IDS=() NAMES=()
echo "→ Création des assujettis…"
for row in "${ASSUJETTIS[@]}"; do
  IFS='|' read -r name etype sector city crit regime tier <<< "$row"
  payload=$(jq -n --arg n "$name" --arg t "$etype" --arg s "$sector" --arg c "$city" \
    --arg cr "$crit" --arg r "$regime" --arg ti "$tier" \
    '{action:"create",name:$n,entity_type:$t,sector:$s,city:$c,country:"Sénégal",
      criticality:$cr,obligation_regime:$r,tier:$ti,reg_status:"active"}')
  resp=$(invoke manage-entity "$payload")
  id=$(echo "$resp" | jq -r '.entity.id // empty')
  if [ -n "$id" ]; then IDS+=("$id"); NAMES+=("$name"); echo "  ✓ $name → $id"
  else echo "  ✗ $name → $(echo "$resp" | jq -rc '.error // .')"; fi
done
[ ${#IDS[@]} -gt 0 ] || { echo "✗ Aucun assujetti créé, arrêt."; exit 1; }

# --- 2) Mesures : index_assujetti|measure_type|title|legal_basis|deadline
MEASURES=(
  "1|mise_en_demeure|Correctifs post-contrôle — chiffrement des données fiscales et segmentation|Loi n°2008-41 (cybersécurité)|2026-09-15"
  "2|recommandation|Renforcement de la gestion des identités|Directive DCSSI 2025-03|2026-10-01"
  "0|injonction|Mise en conformité du plan de continuité de l'infrastructure|Loi n°2008-41 art. 12|2026-08-30"
)
echo "→ Émission des mesures…"
for row in "${MEASURES[@]}"; do
  IFS='|' read -r idx mtype title legal deadline <<< "$row"
  eid="${IDS[$idx]:-}"; [ -n "$eid" ] || continue
  payload=$(jq -n --arg e "$eid" --arg mt "$mtype" --arg t "$title" --arg l "$legal" --arg d "$deadline" \
    '{action:"issue",entity_id:$e,measure_type:$mt,title:$t,legal_basis:$l,deadline:$d,finding_ids:[]}')
  resp=$(invoke issue-measure "$payload")
  if echo "$resp" | jq -e '.measure // .id // .success' >/dev/null 2>&1; then
    echo "  ✓ [${NAMES[$idx]}] $mtype — $title"
  else echo "  ✗ [${NAMES[$idx]}] $(echo "$resp" | jq -rc '.error // .')"; fi
done

# --- 3) Incidents : index_assujetti|category|severity|title|detected_at
INCIDENTS=(
  "0|ransomware|critique|Chiffrement de serveurs d'infrastructure|2026-07-20T08:00:00Z"
  "1|fuite_donnees|eleve|Exposition de données fiscales via une API|2026-07-25T14:30:00Z"
  "3|intrusion|moyen|Accès non autorisé détecté sur le VPN|2026-07-28T22:10:00Z"
)
echo "→ Déclaration des incidents…"
for row in "${INCIDENTS[@]}"; do
  IFS='|' read -r idx cat sev title detected <<< "$row"
  eid="${IDS[$idx]:-}"; [ -n "$eid" ] || continue
  payload=$(jq -n --arg e "$eid" --arg c "$cat" --arg s "$sev" --arg t "$title" --arg d "$detected" \
    '{action:"declare",entity_id:$e,category:$c,severity:$s,title:$t,detected_at:$d,
      description:"Incident déclaré dans le cadre de la démo DCSSI."}')
  resp=$(invoke declare-incident "$payload")
  if echo "$resp" | jq -e '.incident_id // .success' >/dev/null 2>&1; then
    echo "  ✓ [${NAMES[$idx]}] $sev — $title"
  else echo "  ✗ [${NAMES[$idx]}] $(echo "$resp" | jq -rc '.error // .')"; fi
done

echo ""
echo "✅ Seed terminé : ${#IDS[@]} assujettis provisionnés."
echo "   Connecte-toi sur Regul (admin@dcssi.sn) → le cockpit DCSSI doit lister"
echo "   le parc, les mesures et les incidents."
