# Gëstu — Charte Graphique & Identité Visuelle

> Ce fichier est la référence unique pour toute décision visuelle sur le projet.
> Toute génération de code UI doit respecter ces règles.

---

## 1. Logo

### Symbole
Bouclier vert forêt avec empreinte digitale dorée à l'intérieur.
- Le bouclier = protection, conformité
- L'empreinte = identité numérique, confiance
- Le contour du bouclier est doré

### Texte
- **Gëstu** en Inter 800 (extra-bold), vert forêt `#1B4332`
- Le tréma (¨) sur le "e" est composé de deux points dorés `#D4A843`
- Le tréma est positionné juste au-dessus du "e", pas trop haut

### Sous-titre produit
- Affiché sous "Gëstu" en lettres capitales espacées (letter-spacing: 3px)
- La couleur du sous-titre identifie le produit (voir section Produits)
- "Group" pour la marque mère (gris `#9CA3AF`)

### Déclinaisons
- **Fond clair** : bouclier vert plein + contour or, texte vert forêt
- **Fond sombre** : bouclier transparent + contour or, texte blanc
- **Sidebar** : version compacte (bouclier 22px + texte 17px)
- **Favicon** : bouclier seul avec empreinte simplifiée (4 arcs)

### Fichier SVG
Le logo SVG est dans `src/assets/logo-shield.svg` (bouclier seul) et utilisé comme composant React `<GestuLogo />`.

---

## 2. Palette de couleurs

### Vert Forêt (couleur principale)
| Token | Hex | Usage |
|-------|-----|-------|
| `forest-900` | `#1B4332` | Sidebar, textes principaux, bouclier |
| `forest-700` | `#2D6A4F` | Boutons primaires, liens actifs |
| `forest-500` | `#40916C` | Hover, accents secondaires |
| `forest-300` | `#74C69D` | Bordures actives |
| `forest-100` | `#D8F3DC` | Fonds légers, barres de progression |
| `forest-50`  | `#F0FFF4` | Hover très léger |

### Or (couleur d'accent)
| Token | Hex | Usage |
|-------|-----|-------|
| `gold-600` | `#B8922E` | Texte or foncé |
| `gold-500` | `#D4A843` | Tréma, contour bouclier, empreinte, CTA premium |
| `gold-400` | `#E2C26B` | Hover or |
| `gold-200` | `#F2E2B1` | Fond badges or |
| `gold-50`  | `#FDF8E8` | Fond surlignage or |

### Neutres
| Token | Hex | Usage |
|-------|-----|-------|
| `bg`      | `#FAFAF8` | Fond de page |
| `white`   | `#FFFFFF` | Cartes, modales |
| `text-900`| `#1A1A1A` | Titres |
| `text-700`| `#374151` | Corps de texte |
| `text-500`| `#6B7280` | Labels, descriptions |
| `text-300`| `#9CA3AF` | Placeholder, hints |
| `border`  | `#E5E7EB` | Bordures, séparateurs |

### Sémantiques
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#27AE60` | Validations, badges approuvé |
| `error`   | `#C0392B` | Erreurs, badges rejeté |

---

## 3. Couleurs produits

Chaque produit Gëstu a une couleur signature utilisée uniquement sur le sous-titre du logo et les accents dans l'interface du produit.

| Produit | Couleur | Hex | Signification |
|---------|---------|-----|---------------|
| **Comply** | Or | `#D4A843` | Confiance, certification |
| **Risk** | Terracotta | `#E07A5F` | Alerte, vigilance |
| **Privacy** | Violet | `#7B68EE` | Discrétion, protection données |
| **Policy** | Bleu | `#3B82F6` | Structure, gouvernance |

Le bouclier et le texte "Gëstu" restent identiques quel que soit le produit. Seul le sous-titre change de couleur.

---

## 4. Typographie

| Usage | Police | Poids | Taille |
|-------|--------|-------|--------|
| Titres H1 | Inter | 700 (bold) | 20-24px |
| Titres H2 | Inter | 600 (semibold) | 16-18px |
| Corps | Inter | 400 (regular) | 13-14px |
| Labels | Inter | 500 (medium) | 12-13px |
| Badges | Inter | 500 (medium) | 11px |
| Code (contrôles) | JetBrains Mono | 500 | 12-13px |
| Logo "Gëstu" | Inter | 800 (extrabold) | variable |

---

## 5. Composants UI

### Boutons
- **Primaire** : `bg-forest-700`, texte blanc, hover `bg-forest-900`
- **Or/Premium** : `bg-gold-500`, texte `forest-900`, hover `bg-gold-600`
- **Secondaire** : bordure `border`, texte `text-700`, hover `bg-forest-50`
- **Danger** : `bg-error`, texte blanc
- Border-radius : 8px
- Padding : 10px 20px (normal), 6px 14px (petit)

### Badges
- Border-radius : 99px (pill)
- Padding : 2px 10px
- Variantes : forest (vert), gold (or), success (vert émeraude), error (rouge), gray (neutre)

### Cartes
- Background : white
- Border : 1px solid `border`
- Border-radius : 10-12px
- Shadow : aucune par défaut, `shadow-md` au hover si cliquable

### Sidebar
- Background : `forest-900`
- Largeur : 240px (desktop), slide sur mobile
- Item actif : `bg-white/10`, texte blanc, liseré gauche `gold-500` (3px)
- Item inactif : texte `white/60%`
- Logo en haut avec bouclier + "Gëstu" + sous-titre produit
- Profil utilisateur en bas

### Formulaires

Deux patterns selon le contexte :

**Wizard (multi-étapes)** — pour les formulaires longs (3+ sections) : création de mission, fiche client
- Sidebar fond blanc avec ligne verticale connectée (composant `<FormWizard>`)
- Ligne de progression `forest-500` qui se remplit au fur et à mesure
- Étape active : dot `forest-700` avec halo `forest-100` (shadow ring)
- Étape complétée : dot `success` vert avec coche
- Étape future : dot blanc avec bordure `gray-200`
- Une section visible à la fois
- Boutons Précédent/Suivant

**Deux colonnes (settings)** — pour les formulaires courts : organisation, profil
- Label + description à gauche (fond `bg`)
- Champs à droite (fond blanc)
- Sections séparées par des bordures (composant `<SplitFormSection>`)

**Champs communs :**
- Input border : `border` (gray-200)
- Focus : `border-forest-500` + ring `forest-100`
- Border-radius : 10px
- Labels : `text-700`, 12-13px, medium
- Select : chevron custom, même style que input

---

## 6. Spacing & Layout

- Page padding : 24px (mobile), 28px (desktop)
- Section gap : 24-32px
- Card padding : 20px
- Grid gap : 16px
- Max content width : 1100px

---

## 7. Toasts (feedback transient)

**Lib** : `sonner` — wrapper `useToast()` dans `src/hooks/useToast.ts`.

**Position** : `bottom-right`, empilement vertical, expand au survol.

**Variantes et durées :**

| Variante | Usage | Durée | Couleur |
|----------|-------|-------|---------|
| `success` | Sauvegarde, soumission, suppression réussies | 4 s | Vert #27AE60 sur #ECFDF5 |
| `error` | Échec d'une opération · message générique uniquement | 6 s + dismissable | Rouge #C0392B sur #FEF2F2 |
| `info` | Événement neutre, notification d'état | 4 s | Bleu #1D4ED8 sur #EFF6FF |
| `warn` | Action permise mais à surveiller | 5 s | Ambre #B45309 sur #FFFBEB |
| `loading` (`promise`) | Upload, analyse IA, etc. — mute en succès/erreur à la fin | jusqu'à résolution | Vert forêt |

**Règles :**
1. **Toast vs ErrorAlert** : toast pour le feedback transient post-action ; `ErrorAlert` pour les erreurs persistantes/bloquantes (ex. chargement initial échoué).
2. **Sécurité** : le wrapper `useToast().error()` impose un message générique côté UI. Le détail technique (message Supabase, stack) est loggé via `console.error()`, jamais affiché. Cohérent avec CLAUDE.md §3.
3. **Pas de HTML brut** : passer uniquement des strings dans les toasts. Pas de `dangerouslySetInnerHTML`.
4. **CTA optionnel** : pour les toasts post-action, proposer une action contextuelle (« Voir le suivi », « Réessayer ») — limite à 1 action.
5. **Accessibilité** : `aria-live="polite"` géré par sonner. Bouton de fermeture visible.

---

## 8. Validation de formulaire (inline)

**Hook** : `useFieldValidation()` dans `src/hooks/useFieldValidation.ts` (validateurs livrés : `required`, `email`, `url`, `phone`, `minLength`, `compose`).
**Composant** : `FormField` accepte les props `error?: string | null`, `onBlur?: () => void`.
**Wizard** : chaque `WizardStep` peut déclarer un `validate?: () => boolean` qui bloque « Suivant » et déclenche l'affichage des erreurs.

**États visuels :**

| État | Déclencheur | Visuel | a11y |
|------|-------------|--------|------|
| repos | Champ jamais touché | Bordure grise · pas de message | `aria-invalid="false"` |
| focus | Curseur dans le champ | Bordure verte + halo `forest-100` | `aria-invalid="false"` |
| erreur | Blur sur valeur invalide ou tentative de submit | Bordure rouge · message rouge sous le champ · icône `!` | `aria-invalid="true"` + `aria-describedby` |

**Règles :**
1. **Pas d'erreur à la frappe** : on n'affiche jamais d'erreur tant que l'utilisateur n'a pas blurré le champ ou tenté de submit. Évite les faux positifs.
2. **Validation côté serveur obligatoire** : la validation inline est une couche UX, jamais une couche de sécurité. Toute donnée doit être re-validée côté serveur (Edge Function, contrainte DB, RLS) — cf. CLAUDE.md §3.
3. **Messages génériques** : les messages d'erreur sont des strings statiques fournis par les validateurs. Pas d'interpolation depuis du contenu utilisateur non échappé (anti-XSS).
4. **Astérisque rouge** : les champs requis affichent un `*` rouge à côté du label.
5. **Compteur en pied de wizard** : quand une étape est invalide, le wizard affiche « Champs à corriger avant de poursuivre. » et le pastille de l'étape passe en rouge avec un `!`.

---

## 9. Autosave (sauvegarde automatique)

**Hook** : `useAutosave()` dans `src/hooks/useAutosave.ts` — gère le cycle modified/saving/saved/error, le debounce, l'abort des cycles obsolètes et un `flush()` impératif.
**Composant** : `AutosaveIndicator` (`src/components/ui/AutosaveIndicator.tsx`) — pastille discrète à placer en pied de zone de saisie.

**États visuels :**

| Statut | Apparence | Quand |
|--------|-----------|-------|
| `modified` | Cercle gris · « Modifications non enregistrées » | Frappe en cours, débounce pas encore écoulé |
| `saving` | Spinner vert forêt · « Enregistrement… » | Appel réseau en cours |
| `saved` | Check vert · « Enregistré il y a Xs » (rafraîchi 30 s) | Dernier save réussi |
| `error` | Icône rouge · « Échec d'enregistrement » + lien « Réessayer » | Échec réseau ou serveur |

**Règles :**
1. **Délai de debounce** : 1 500 ms par défaut. Modifiable via `delayMs` quand le contexte le justifie.
2. **Save silencieux** : l'autosave appelle le saver avec `{ silent: true }` — pas de toast succès/erreur, pas de refetch global. Seuls les saves manuels et les soumissions toastent.
3. **Désactivation** : `disabled={true}` quand le contenu est en lecture seule (assessment soumis, mode revue). Tout pending save est flushé avant désactivation effective.
4. **Flush impératif** : appeler `autosave.flush()` avant changement de contexte (switch d'item, soumission, navigation) pour ne perdre aucune saisie.
5. **Validation côté serveur reste obligatoire** : l'autosave ne contourne aucune RLS ni contrainte. La couche est purement UX (CLAUDE.md §3).
6. **Bouton « Enregistrer » manuel conservé** : utile pour forcer un save immédiat (ex : avant de fermer l'onglet) et pour les utilisateurs qui ont besoin du repère visuel.

---

## 10. Règles d'application

1. **Ne jamais modifier les couleurs du bouclier** — toujours vert forêt + or
2. **Le tréma doré est obligatoire** sur le "e" de Gëstu dans tous les contextes
3. **Le sous-titre produit** est la seule partie du logo qui change par produit
4. **Pas de dégradés** — couleurs plates uniquement
5. **Pas d'ombres sur les cartes** sauf hover des éléments cliquables
6. **Inter est la seule police** pour l'interface (JetBrains Mono pour le code)
7. **Les couleurs produits** ne doivent pas contaminer les composants partagés (boutons, badges, cartes)
