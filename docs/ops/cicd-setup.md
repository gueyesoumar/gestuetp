# CI/CD — environnements & déploiement (ETP)

Automatisation GitHub Actions + Vercel + Supabase pour **dev / test / prod**.
Décisions : runner de migrations **psql custom** + **projet test gratuit dédié**
(cf [[project_environments]]). Prod migrée **sur approbation manuelle**.

## Matrice cible

| Env  | Branche git | Frontend (Vercel) | Base (Supabase)      | Migrations & edge fns        |
|------|-------------|-------------------|----------------------|------------------------------|
| prod | `main`      | Production        | **jibbl**            | CI au merge — **approbation** |
| test | `staging`   | Preview « staging»| **projet test** (neuf)| CI au merge — auto           |
| dev  | `feat/*`    | Preview           | projet test (partagé) / local | manuel / local        |

Le frontend est déjà auto-déployé par Vercel (push → build). Ce dispositif ajoute
l'automatisation **base + edge functions**, pilotée par la branche = environnement.

## Pièces livrées (dans le repo)

- `scripts/migrate.sh` — applique les `NNNNN_nom_up.sql` en attente, suivi dans
  `ops.migrations`. Modes : `apply` (défaut), `--baseline` (marque appliqué sans
  exécuter), `--dry-run`.
- `.github/workflows/deploy.yml` — push `staging`→env staging (auto), push `main`→
  env production (approbation). Applique migrations + déploie edge functions si le
  chemin correspondant a changé.
- `.github/workflows/ci.yml` — inchangé : typecheck+build sur PR/push.

## Mise en place (une fois) — À FAIRE

Toutes les chaînes de connexion = **« Session pooler »** de Supabase (Settings →
Database → Connection pooling → *Session mode*, port 5432, IPv4). Les runners
GitHub sont IPv4 → la connexion « Direct » (IPv6) échouerait.

### 1. Créer le projet test
Dashboard Supabase → New project (Free), ex. `gestu-etp-test`. Noter **project ref**
+ **mot de passe DB**. Ce projet **remplace snayz**.

### 2. Cloner le schéma jibbl → test (ne PAS rejouer les 164 migrations)
```bash
supabase link --project-ref jibblzpownddlodzmewj
supabase db dump -f prod-schema.sql            # schéma (public + schémas custom)
psql '<TEST_SESSION_POOLER_URL>' -v ON_ERROR_STOP=1 -f prod-schema.sql
```
> La 00154 code en dur l'URL snayz + lit Vault → un rejeu intégral planterait. Le
> clone de schéma capture l'état réel de prod (dont les correctifs manuels) sans ce
> piège.

### 3. Baseliner les deux bases (marquer 00001-00164 appliquées)
```bash
DATABASE_URL='<JIBBL_SESSION_POOLER_URL>' bash scripts/migrate.sh --baseline
DATABASE_URL='<TEST_SESSION_POOLER_URL>'  bash scripts/migrate.sh --baseline
```
À partir de là, seules les **nouvelles** migrations (00165+) seront appliquées par la CI.
> En local, entourer la chaîne de connexion de **guillemets simples** (mots de passe
> à caractères spéciaux).

### 4. GitHub Environments + secrets
Settings → Environments → créer `staging` et `production`.
- `production` : activer **Required reviewers** (= toi) → garde-fou avant migration prod.
- Dans **chaque** environnement :
  - secret `DATABASE_URL` = session pooler de l'env (test / jibbl)
  - secret `SUPABASE_ACCESS_TOKEN` = jeton CLI (Account → Access Tokens ; peut aussi être repo-level)
  - variable `SUPABASE_PROJECT_REF` = ref du projet de l'env

### 5. Vercel : staging → projet test
Repointer les variables de l'environnement staging vers le **projet test** (remplace
la redirection provisoire vers jibbl) :
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` = valeurs du projet test. Redéployer.

### 6. Décommissionner snayz
Une fois test opérationnel et le pipeline vérifié.

## Vérifier le pipeline
1. Créer une migration bidon `00165_ci_smoke_up.sql` (ex. `select 1;`) + son `_down`.
2. Commit sur une branche → PR → merge dans `staging`.
3. Onglet **Actions** : le job `Deploy` (env staging) applique la migration sur test.
4. Vérifier `select * from ops.migrations order by version desc limit 3;` sur test.
5. Merge `staging`→`main` (PR) : le job `Deploy` (env production) **attend ton
   approbation** avant de migrer jibbl.

## Rollback
Le suivi `ops.migrations` liste l'appliqué. Rollback = jouer le `_down.sql`
correspondant à la main sur la base concernée, puis
`delete from ops.migrations where version = 'NNNNN';`.
