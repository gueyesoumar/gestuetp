-- 00256 — Phase 5a (RFC 0010) : analyse d'impact spécialisée.
-- Additif : chaîne les runs (impact.parent = run de faisabilité) + flag DPA dédié.
-- agent_runs (00131) supporte déjà kind='impact' (colonne text) → pas de table.
-- Les colonnes pr_* et le flag support_agent_draft_pr seront posés au Lot 2 (5b).

alter table public.agent_runs
  add column if not exists parent_run_id uuid references public.agent_runs(id) on delete set null;

create index if not exists agent_runs_parent_idx on public.agent_runs (parent_run_id);

comment on column public.agent_runs.parent_run_id is 'Chaîne les runs : le run impact référence le run de faisabilité (RFC 0010, Phase 5a).';

-- Garde-fou DPA : flag OFF par défaut. Tant qu'il est false, dispatch-impact refuse
-- (rien ne part vers GitHub Actions / Anthropic). À activer APRÈS feu vert DPA (déc. B).
insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'support_agent_impact',
  'Agent d''analyse d''impact (IA)',
  'Analyse d''impact spécialisée (map-reduce) via GitHub Actions + Anthropic (lit le code du dépôt). OFF par défaut : activer seulement après feu vert DPA.',
  false
)
on conflict (slug) do nothing;
