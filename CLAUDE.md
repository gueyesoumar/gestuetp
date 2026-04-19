# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est lu automatiquement par Claude Code au debut de chaque session.
> Il definit les regles non negociables du projet Gestu ETP.

---

## Projet

Gestu Comply — plateforme multi-referentiels de conformite et d'audit SI.
Stack : React 18 + Vite + TypeScript strict + Tailwind CSS v4 + Supabase (Auth, DB, Storage, RLS).

**Charte graphique** : Toutes les decisions visuelles sont dans `BRAND.md` a la racine. Lire BRAND.md avant toute generation de code UI. Couleurs : vert foret (#1B4332) + or (#D4A843). Logo : bouclier + empreinte digitale + trema dore. Police : Inter + JetBrains Mono.

---

## 1. TypeScript strict

- `strict: true` dans tsconfig.json — jamais de `any` implicite
- Pas de `as Type` non justifie. Si un cast est necessaire, ajouter un commentaire expliquant pourquoi
- Typer toutes les fonctions : parametres ET retour
- Utiliser les types de `src/types/database.types.ts` pour toute interaction Supabase
- Privilegier `unknown` a `any` quand le type est indetermine
- Utiliser des unions discriminees plutot que des champs optionnels quand l'etat est mutuellement exclusif

## 2. Architecture et maintenabilite

- **Max 150 lignes par composant**. Au-dela, decouper en sous-composants
- **Separation des responsabilites** : un fichier = une responsabilite
  - `features/<module>/` : logique metier, contextes, hooks specifiques au module
  - `components/` : composants UI reutilisables (pas de logique metier)
  - `hooks/` : hooks partages entre modules
  - `pages/` : composants de page (assemblage, pas de logique)
  - `lib/` : clients et utilitaires techniques (supabase, etc.)
  - `types/` : types partages
- **Nommage** : PascalCase pour les composants/types, camelCase pour les fonctions/variables, SCREAMING_SNAKE pour les constantes
- **Pas de duplication** : si une logique est utilisee 2+ fois, extraire dans un hook ou un utilitaire
- **Pas d'abstraction prematuree** : ne pas creer de helper pour un usage unique
- **Colocation** : garder les fichiers proches de leur usage (types locaux dans le meme dossier)
- **Formulaires** : privilegier les listes deroulantes (select) plutot que les champs texte libre chaque fois que les valeurs sont previsibles. Les options doivent etre centralisees dans `src/lib/constants.ts` pour garantir la coherence sur toute la plateforme (ex: effectifs, secteurs, pays, impacts). Un meme champ doit proposer les memes options partout.

## 3. Securite

- **Jamais de secrets cote client** : les cles API, tokens, credentials ne doivent jamais apparaitre dans le code frontend
- **Validation des entrees** : valider et sanitizer toute donnee utilisateur avant utilisation
- **RLS obligatoire** : chaque table Supabase doit avoir RLS active. Tester avec un compte non-admin
- **Pas de recursion RLS** : une policy sur une table ne doit JAMAIS interroger cette meme table en sous-requete. Utiliser une fonction SECURITY DEFINER a la place (ex: `get_my_user_id()`, `get_my_organization_id()`, `get_my_mission_ids()`). Verifier ce pattern sur TOUTES les tables lors de la creation de policies
- **Pas de confiance cote client** : toute operation sensible (elevation de privileges, creation d'org, validation) passe par le service_role cote backend
- **Protection XSS** : ne jamais utiliser `dangerouslySetInnerHTML`. Utiliser les mecanismes d'echappement de React
- **Protection CSRF** : utiliser les tokens de session Supabase, pas de cookies custom
- **Dependances** : verifier sur npmjs.com avant d'installer tout package. Privilegier les packages avec maintenance active et large adoption
- **Erreurs** : ne jamais exposer les messages d'erreur techniques a l'utilisateur final. Logger en console, afficher un message generique

## 4. Gestion async et Supabase

- Tout `useEffect` async doit avoir un cleanup (`AbortController` ou return function)
- Chaque requete Supabase doit avoir un bloc `error` gere explicitement :
  ```typescript
  const { data, error } = await supabase.from('table').select('*')
  if (error) {
    console.error('Context:', error.message)
    // gerer l'erreur (setState, throw, return)
  }
  ```
- Utiliser `.abortSignal()` sur les requetes Supabase dans les useEffect
- Utiliser le client type `supabase` de `src/lib/supabase.ts` (jamais creer un second client)

## 5. Strings francais dans le JSX

- Toujours utiliser les entites HTML (`&apos;`, `&laquo;`, `&raquo;`, `&agrave;`, `&eacute;`, `&euml;`) ou template literals
- Jamais d'apostrophes ou guillemets francais bruts dans le JSX

## 6. Migrations SQL

- Chaque migration doit avoir un script `up` ET un script `down` (rollback)
- Convention : `supabase/migrations/NNNNN_nom_up.sql` et `NNNNN_nom_down.sql`
- Toujours verifier les dependances entre tables avant de creer des policies RLS cross-table

## 7. Tests et qualite

- Tester le golden path ET les cas limites
- Tester avec un compte non-admin avant de deployer (RLS)
- Verifier la coherence avec CONTEXT.md a chaque changement

## 8. Git

- Ne jamais committer de fichiers sensibles (`.env`, credentials, etc.)
- Messages de commit concis, en anglais, au present

---

## Checklist avant chaque generation de code

1. Y a-t-il des `any` ou `as Type` non justifies ?
2. Les appels Supabase ont-ils un bloc `error` gere ?
3. Les hooks async ont-ils un cleanup ?
4. Le composant fait-il plus de 150 lignes ?
5. Y a-t-il des apostrophes francaises brutes dans le JSX ?
6. Le code expose-t-il des secrets ou des messages d'erreur techniques ?
7. Les operations sensibles passent-elles par le service_role ?
8. Ce code est-il coherent avec CONTEXT.md ?
