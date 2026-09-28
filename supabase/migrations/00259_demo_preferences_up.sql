-- 00259 — Préférences UI de démo (refonte démo · Lot F).
-- Persiste la « lentille » démo PAR UTILISATEUR (au lieu du localStorage par-navigateur),
-- pour une cohérence sur tous les appareils. RLS user-owned (get_my_user_id, SECURITY
-- DEFINER, pas de récursion). Aucune donnée sensible.

create table if not exists public.demo_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  lens_on boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.demo_preferences enable row level security;

create policy "demo_prefs_select_own" on public.demo_preferences
  for select using (user_id = public.get_my_user_id());
create policy "demo_prefs_insert_own" on public.demo_preferences
  for insert with check (user_id = public.get_my_user_id());
create policy "demo_prefs_update_own" on public.demo_preferences
  for update using (user_id = public.get_my_user_id()) with check (user_id = public.get_my_user_id());
