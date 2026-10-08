# Kit vidéos de démo — Gëstu (Playwright)

Enregistre des **vidéos de vrais parcours** de la plateforme (voie B). Tu exécutes tout
en local (tu es connecté) ; aucun mot de passe ni secret 2FA n'est stocké — seule une
**session** est sauvegardée localement dans `.auth/` (gitignoré).

## Prérequis
- Node ≥ 18.
- Instance cible avec **données de démo** pour que le parcours n'échoue pas :
  - ≥ 1 **référentiel actif** avec des contrôles (ex. ISO 27001, PSSI-ES) ;
  - ≥ 1 **client** au portefeuille ;
  - ≥ 2 **membres** d'équipe, dont au moins un **chef de mission éligible** distinct de l'associé.
  - 👉 Le plus simple : lance-le sur **snayz** après avoir créé un espace de démo
    (« Explorer un espace d'exemple » → crée client + missions + équipe).
- Compte avec **2FA déjà activé** (tu saisis le code toi-même à l'étape d'auth).

## Installation (une fois)
```bash
cd tools/demo-videos
npm install
```

### Navigateur — **téléchargement résumable** (recommandé)
⚠️ N'utilise **pas** `npx playwright install` : son téléchargeur **ne reprend pas** après
une coupure réseau (il recommence de zéro) et **supprime** au passage tout Chromium en
cache. Sur une connexion instable, utilise le script résumable :
```bash
bash download-chromium.sh      # relançable : reprend là où ça s'est arrêté
```
Il affiche à la fin une ligne `export CHROME_BIN="…"` — copie-la et exécute-la (les
scripts `auth` / `record:*` lisent `CHROME_BIN`). Garde ce `export` dans le même terminal.

*(Réseau stable ? Tu peux à la place faire `npx playwright install chromium` et ignorer
`CHROME_BIN`.)*

## 0. Staging protégé par Vercel ? (mur « connexion Vercel/GitHub/Google »)
Si la fenêtre tombe sur un **mur d'authentification Vercel** (et que Google ferme la
fenêtre car il bloque les navigateurs automatisés), active le contournement prévu par
Vercel — **sans toucher à Google** :
1. Vercel → projet **staging** → *Settings → Deployment Protection* →
   **Protection Bypass for Automation** → activer → copier le secret.
2. Exporte-le dans le terminal, puis lance l'auth :
   ```bash
   export VERCEL_BYPASS="colle-le-secret-ici"
   ```
Les scripts envoient alors l'en-tête `x-vercel-protection-bypass` et atteignent
directement l'app. Garde ce `export` dans le même terminal que `npm run`.

*(Prod `app.gestugroup.com` n'est en général pas protégée ainsi — mais évite d'y créer
des missions de démo.)*

## 1. Sauvegarder ta session (une fois, navigateur visible)
```bash
npm run auth
# (optionnel) autre instance : BASE_URL=https://app.gestugroup.com npm run auth
```
Une fenêtre s'ouvre sur la page de connexion → **connecte-toi (email + mot de passe +
code 2FA)**. Dès que tu es sur le Hub, la session est enregistrée dans `.auth/state.json`.
À refaire seulement quand la session expire.

## 2. Enregistrer la vidéo « Créer une mission »
```bash
npm run record:create-mission
# variantes :
BASE_URL=https://test.gestugroup.com npm run record:create-mission
SUBMIT=false npm run record:create-mission   # s'arrête au récapitulatif, ne crée rien
```
Sorties :
- **`videos/creer-une-mission.webm`** — capture brute (source).
- **`videos/creer-une-mission.mp4`** — version partageable (H.264), **temps mort du début
  rogné automatiquement** si `ffmpeg` est présent (sinon seul le WebM est produit).

La vidéo affiche un **curseur synthétique** (rond doré qui suit la souris et « pulse » aux
clics) et une **légende d'étape** flottante (« Étape 3 — Périmètre & contrôles »), pour que
le parcours se suive sans commentaire audio.

> Par défaut, le script **crée réellement** une mission (utile pour une démo complète).
> Utilise `SUBMIT=false` pour t'arrêter au récapitulatif sans rien créer, ou lance-le
> sur snayz / un client de démo pour ne pas polluer des données réelles.

## Convertir / re-monter en MP4 (optionnel)
Le MP4 est déjà généré. Pour un ré-encodage manuel depuis le WebM :
```bash
ffmpeg -i videos/creer-une-mission.webm -c:v libx264 -pix_fmt yuv420p videos/creer-une-mission.mp4
```

## Réglages
- **Rythme** : `slowMo: 350` + pauses dans `record-create-mission.mjs` (augmente pour
  ralentir la vidéo).
- **Résolution / netteté** : capture **Full HD 1920×1080** (viewport = `recordVideo.size`,
  capturé 1:1). ⚠️ `deviceScaleFactor` n'augmente PAS la résolution capturée par Playwright
  (il n'ajoute que du vide autour) — pour plus de netteté, **agrandir le viewport**, pas le
  scale factor. Le MP4 est ré-encodé en `-crf 18 -preset slow`. Pour un fichier plus léger,
  baisser le viewport (1600×900) ou ajouter `-vf scale=1280:-2` à la commande ffmpeg.
- **Autres parcours** : dupliquer `record-create-mission.mjs` et adapter les sélecteurs
  (ancrés sur les titres d'étape). Dis-moi lesquels tu veux, je fournis le script.

## Sécurité
- `.auth/`, `videos/`, `node_modules/` sont **gitignorés**.
- `.auth/state.json` contient un **jeton de session** valide : ne le commite pas, ne le
  partage pas. Supprime-le pour révoquer l'accès local (`rm -rf .auth`).
