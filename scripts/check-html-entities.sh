#!/usr/bin/env bash
# Garde-fou : détecte les entités HTML (&eacute;, &hellip;, &mdash;…) dans des
# STRINGS JavaScript, où elles ne décodent PAS et s'affichent en clair.
#
# Rappel : une entité HTML ne se décode QUE dans (a) le texte JSX (>...<) et
# (b) les attributs string littéraux (label="..."). Partout ailleurs — ternaire
# {x ? 'a' : 'b'}, template literal `...`, .join('...'), valeur d'objet, fichier
# .ts — il faut un CARACTÈRE UTF-8 RÉEL (é, è, à, ô, —, •, …).
set -uo pipefail
cd "$(dirname "$0")/.."

ENT='&[a-zA-Z]+;'

# 1) Fichiers .ts (aucun JSX) : toute entité dans une string/backtick.
m1=$(grep -rnE "['\"\`][^'\"\`]*${ENT}" src --include='*.ts' 2>/dev/null \
      | grep -vE 'database\.types|\.d\.ts' || true)

# 2) Template literals (.tsx) : entité ENTRE backticks (donc dans la chaîne, pas
#    dans le texte JSX voisin).
m2=$(grep -rnE "\`[^\`]*${ENT}[^\`]*\`" src --include='*.tsx' 2>/dev/null || true)

# 3) Ternaires / expressions ({...}, .join(), ? :) en quotes simples/doubles.
m3=$(grep -rnE "([?:]|\.join\(|\{)\s*['\"][^'\"]*${ENT}" src --include='*.tsx' 2>/dev/null \
      | grep -vE '(label|title|placeholder|description|aria-label|subtitle|emptyLabel|emptyMessage|text|message|submitLabel|name|alt|href|value|content)=' || true)

out=$(printf '%s\n%s\n%s\n' "$m1" "$m2" "$m3" | grep -vE '^[[:space:]]*$' | sort -u || true)

if [ -n "$out" ]; then
  echo "❌ Entités HTML dans des strings JS (elles ne décodent pas — utiliser un caractère UTF-8 réel) :"
  echo "$out"
  echo ""
  echo "Fix : remplacer &eacute; -> é, &ocirc; -> ô, &hellip; -> …, &mdash; -> —, &bull; -> •, etc."
  echo "Les entités ne décodent QUE dans le texte JSX et les attributs \"...\"."
  exit 1
fi
echo "✓ Aucune entité HTML en contexte string JS."
