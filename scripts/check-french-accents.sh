#!/usr/bin/env bash
# Garde-fou : détecte des mots français FRÉQUENTS écrits SANS accent dans le contenu
# (strings src + seeds SQL). Heuristique curée (liste de mots quasi toujours accentués
# en français) - complète check-html-entities.sh. Voir CLAUDE.md §5.
#
# Usage : npm run check:accents  (ou: bash scripts/check-french-accents.sh [--seeds-only])
# Sortie : liste fichier:ligne des occurrences ; exit 1 si au moins une trouvée.
set -uo pipefail
cd "$(dirname "$0")/.."

# Mots dont la forme ASCII ci-dessous est, en français, quasi toujours accentuée.
# (On exclut volontairement les mots ambigus/déjà corrects : mesure, requise, cadre...)
WORDS='securite|securites|conformite|systeme|systemes|entite|entites|referentiel|referentiels|donnee|donnees|evaluation|evaluations|integrite|operationnel|operationnelle|operationnels|geographique|geographiques|concerne|concernes|concernee|concernees|nomme|nommee|formalise|formalisee|formalisees|organise|organisee|deja|etait|etaient|responsabilite|responsabilites|strategie|strategique|procedure|procedures|brievement|perimetre|designer|designe|controle|controles|defini|definie|reglementaire|reglementaires|reglementation|element|elements|critere|criteres|necessaire|prealable|acces|detecter|detection|gerer|protege|protegee|proteges|protegees|activite|activites|numerique|numeriques|privilegie|privilegies|regulierement|periodique|periodiquement|creee|realise|realisee|verifie|verifiee|dedie|dediee|identifie|identifiee|presidentielle|operationnalisation'

scope_seeds_only="${1:-}"
if [ "$scope_seeds_only" = "--seeds-only" ]; then
  files=$(find supabase/seed -type f -name '*.sql' 2>/dev/null)
else
  files=$(find src supabase/seed -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.sql' \) 2>/dev/null)
fi

out=$(perl -CSD -ne 'print "$ARGV:$.: $_" if /\b(?i:'"$WORDS"')\b/' $files 2>/dev/null)

if [ -n "$out" ]; then
  n=$(printf '%s\n' "$out" | grep -c .)
  echo "❌ $n ligne(s) avec des mots français non accentués (contenu / seeds) :"
  printf '%s\n' "$out" | head -60
  [ "$n" -gt 60 ] && echo "... (+ $((n - 60)) autres)"
  echo ""
  echo "Fix : écrire les accents réels (securite -> sécurité, systeme -> système, entite -> entité, ...)."
  exit 1
fi
echo "✓ Aucun mot français non accentué détecté."
