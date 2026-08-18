# Prototype jetable — agent de triage support

> ⚠️ **Jetable / hors prod.** Non commité par défaut. But : sentir la boucle
> agentique (tool-use multi-étapes) avant d'industrialiser en Edge Function.
> **Lecture seule.** Aucun write, aucun SQL libre — les outils sont une whitelist.

## Lancer

```bash
ANTHROPIC_API_KEY=sk-ant-... \
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_KEY=<anon ou service_role> \
deno run --allow-net --allow-env prototype/support-triage/triage.ts \
  "le client de la mission ISO 27001 dit que l'onglet Rapports ne charge pas"
```

- `ANTHROPIC_API_KEY` : ta clé (celle des Edge Functions, dans les secrets Supabase).
- `SUPABASE_KEY` :
  - **anon** (= `VITE_SUPABASE_ANON_KEY`) → l'agent voit ce que la RLS autorise (plus sûr).
  - **service_role** → visibilité complète, bypass RLS. La clé reste en env local, jamais commitée.
- `TRIAGE_MODEL` (optionnel) : `claude-sonnet-4-6` par défaut (rapide/économe). `claude-opus-4-8` pour plus de finesse.

## Ce que tu verras

Chaque tour : 💭 le raisonnement, 🔧 l'outil appelé + ses arguments, ↳ un aperçu du résultat DB.
À la fin : un triage structuré (CATÉGORIE / GRAVITÉ / CAUSE / PROCHAINE ACTION / DONNÉES VUES) + le coût en tokens.

## Outils exposés (lecture seule)

`search_missions` · `get_mission` · `mission_stats` (évals/preuves par statut + membres) ·
`get_organization` · `get_user` (is_active + permissions cabinet).

## Pour industrialiser ensuite

Ce fichier se porte tel quel vers une Edge Function `run-agent` : remplacer `Deno.args`
par le corps de requête, écrire les étapes dans une table `agent_runs`, gater sur
`is_platform_owner`, réutiliser `_shared/log-ai-call.ts` pour le coût. **Avant prod** :
cadrer le volet DPA/RGPD (des données tenant partent vers Anthropic) et garder les outils
en lecture seule (anti prompt-injection).
