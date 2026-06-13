-- 00131 — Agents (Phase 3) : runs de l'agent de triage + flag de garde-fou.
-- agent_runs : un run par appel (N par ticket), reserve au platform owner.
-- L'Edge Function run-agent ecrit via service_role (bypass RLS).

create table public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.support_requests(id) on delete cascade,
  kind          text not null default 'triage',          -- 'triage' (data) | 'feasibility' (code, plus tard)
  status        text not null default 'queued',          -- queued | running | done | error
  result        jsonb,
  input_tokens  int,
  output_tokens int,
  cost_usd      numeric,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index agent_runs_request_idx on public.agent_runs (request_id);

comment on table public.agent_runs is 'Runs des agents support (triage IA). Reserve au platform owner ; ecrit par run-agent (service_role).';

-- RLS : platform owner uniquement (lecture cote UI). L'Edge Function passe par service_role.
alter table public.agent_runs enable row level security;

create policy agent_runs_owner on public.agent_runs
  for all
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

-- Garde-fou DPA : flag OFF par defaut. Tant qu'il est false, run-agent refuse
-- (aucune donnee tenant n'est envoyee a Anthropic). A activer APRES feu vert DPA.
insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'support_agent_triage',
  'Agent de triage support (IA)',
  'Triage IA des tickets de bug via Anthropic. OFF par defaut : activer seulement apres feu vert DPA (des donnees tenant sont transmises a Anthropic).',
  false
)
on conflict (slug) do nothing;
