-- 00257 — Phase 5b (RFC 0010) : brouillon de PR (chemin d'écriture).
-- Additif : colonnes de suivi de la PR sur agent_runs (kind='draft_pr') + flag DPA.
-- Le brouillon cible TOUJOURS staging (jamais main), périmètre frontend-only borné.

alter table public.agent_runs
  add column if not exists pr_url text,
  add column if not exists pr_branch text,
  add column if not exists pr_state text;   -- drafted | open | merged | closed | error

comment on column public.agent_runs.pr_state is 'État du brouillon de PR (kind=draft_pr) : drafted|open|merged|closed|error (RFC 0010, Phase 5b).';

-- Garde-fou DPA + prérequis GitHub App : flag OFF par défaut. Tant qu'il est false,
-- dispatch-draft-pr refuse. À activer APRÈS feu vert DPA et App « Gëstu Agents » configurée.
insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'support_agent_draft_pr',
  'Agent brouillon de PR (IA)',
  'Génère un brouillon de Pull Request sur staging (frontend-only borné) via GitHub Actions + Anthropic. OFF par défaut : activer seulement après feu vert DPA + GitHub App configurée.',
  false
)
on conflict (slug) do nothing;
