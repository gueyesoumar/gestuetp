-- 00258 — RFC 0011 : assistant d'onboarding in-app (UP).
-- Additif : flag DPA (kill-switch) + persistance des conversations (RLS user-owned)
-- + tours guidés déjà vus. Aucune donnée tenant sensible : le contenu métier ne
-- transite pas ; on ne stocke que la conversation d'aide de l'utilisateur lui-même.

-- Garde-fou DPA/ZDR : flag OFF par défaut. Tant qu'il est false, l'Edge Function
-- onboarding-assistant refuse (rien ne part vers Anthropic). À activer APRÈS feu vert DPA.
insert into public.feature_flags (slug, name, description, is_globally_enabled)
values (
  'support_agent_onboarding',
  'Assistant d''onboarding (IA)',
  'Widget d''aide conversationnel ancré sur les articles d''aide (Messages API, ZDR). OFF par défaut : activer seulement après feu vert DPA.',
  false
)
on conflict (slug) do nothing;

-- Conversations d'onboarding : une ligne par conversation, propriété de l'utilisateur.
-- L'écriture est faite par l'Edge Function (service_role) ; la lecture/reprise par le
-- front (jeton utilisateur) est cloisonnée par RLS. `answered=false` alimente la boucle
-- d'amélioration continue (RFC 0010) : questions restées sans réponse.
create table if not exists public.onboarding_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  route text,
  module text,
  messages jsonb not null default '[]'::jsonb,
  answered boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_conversations_user_idx
  on public.onboarding_conversations (user_id, created_at desc);
create index if not exists onboarding_conversations_unanswered_idx
  on public.onboarding_conversations (answered) where answered = false;

alter table public.onboarding_conversations enable row level security;

-- L'utilisateur ne voit/gère QUE ses propres conversations. get_my_user_id() est
-- SECURITY DEFINER (pas de récursion RLS sur users). L'owner peut lire en agrégat.
create policy "onboarding_conv_select_own" on public.onboarding_conversations
  for select using (user_id = public.get_my_user_id() or public.is_platform_owner());
create policy "onboarding_conv_insert_own" on public.onboarding_conversations
  for insert with check (user_id = public.get_my_user_id());
create policy "onboarding_conv_update_own" on public.onboarding_conversations
  for update using (user_id = public.get_my_user_id()) with check (user_id = public.get_my_user_id());
create policy "onboarding_conv_delete_own" on public.onboarding_conversations
  for delete using (user_id = public.get_my_user_id());

create trigger trg_onboarding_conv_updated_at
  before update on public.onboarding_conversations
  for each row execute function public.set_updated_at();

-- Tours guidés déjà vus par l'utilisateur (déclenchement à la 1re visite d'un module).
create table if not exists public.onboarding_tours_seen (
  user_id uuid not null references public.users(id) on delete cascade,
  tour_id text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, tour_id)
);

alter table public.onboarding_tours_seen enable row level security;

create policy "onboarding_tours_select_own" on public.onboarding_tours_seen
  for select using (user_id = public.get_my_user_id());
create policy "onboarding_tours_insert_own" on public.onboarding_tours_seen
  for insert with check (user_id = public.get_my_user_id());
create policy "onboarding_tours_delete_own" on public.onboarding_tours_seen
  for delete using (user_id = public.get_my_user_id());
