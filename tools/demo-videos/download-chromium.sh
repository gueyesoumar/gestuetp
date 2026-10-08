#!/usr/bin/env bash
# Téléchargement RÉSUMABLE de Chrome for Testing (contourne le téléchargeur non-résumable
# de Playwright, qui échoue sur une connexion instable). Relançable : `-C -` reprend là où
# ça s'est arrêté. À lancer depuis tools/demo-videos/.
set -euo pipefail

# Version alignée sur @playwright/test installé (playwright chromium v1243).
URL="https://cdn.playwright.dev/builds/cft/153.0.8010.12/mac-arm64/chrome-mac-arm64.zip"
ZIP="chrome-cft.zip"
DIR="chrome-cft"

echo ">> Téléchargement (résumable) de Chrome for Testing (~182 Mo)…"
echo ">> Si ça coupe, RELANCE simplement ce script : il reprend où il en était."
until curl -L -C - --retry 10 --retry-delay 5 --retry-all-errors -o "$ZIP" "$URL"; do
  echo ">> coupure réseau — reprise dans 4 s…"; sleep 4
done

echo ">> Décompression…"
rm -rf "$DIR"; mkdir -p "$DIR"
unzip -q "$ZIP" -d "$DIR"

echo ">> Levée de la quarantaine macOS…"
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null || true

BIN="$(/usr/bin/find "$DIR" -type f -name 'Google Chrome for Testing' | head -1)"
if [ -z "$BIN" ]; then echo "❌ Binaire introuvable après décompression."; exit 1; fi

echo ""
echo "✅ Navigateur prêt."
echo ""
echo "Exporte le chemin puis lance les scripts :"
echo ""
echo "  export CHROME_BIN=\"$BIN\""
echo "  npm run auth"
echo "  npm run record:create-mission"
echo ""
