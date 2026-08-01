-- 00132 — Phase 4 : garde-fou DPA pour l'agent de faisabilite (code-facing).
-- Meme principe que support_agent_triage (00131) : flag OFF par defaut.
-- Tant qu'il est false, dispatch-feasibility refuse (aucune donnee tenant ne part
-- vers GitHub Actions ni Anthropic). A activer APRES feu vert DPA.
-- La table agent_runs (00131) supporte deja kind='feasibility' : pas de nouvelle table.

insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'support_agent_feasibility',
  'Agent de faisabilite des suggestions (IA)',
  'Analyse de faisabilite des suggestions via GitHub Actions + Anthropic (lit le code du repo). OFF par defaut : activer seulement apres feu vert DPA (le texte de la suggestion transite par GitHub et Anthropic).',
  false
)
on conflict (slug) do nothing;
