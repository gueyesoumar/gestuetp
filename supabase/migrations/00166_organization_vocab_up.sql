-- Migration 00166 (UP) : vocabulaire par organisation (RFC 0002, P1).
--
-- Couche d'OVERRIDE du vocabulaire, par org. Vide au départ → iso-fonctionnel :
-- le défaut reste résolu par l'édition côté code (vocabForEdition), les overrides
-- se superposent quand une org personnalise (P3). Aucun backfill nécessaire.
--
-- Résolution miroir de get_my_edition/my_capabilities : own-org pour le staff,
-- org superviseur pour un client/assujetti (get_my_supervisor_org, 00161).

create table if not exists public.organization_vocab (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  primary key (org_id, key)
);

comment on table public.organization_vocab is
  'Overrides de vocabulaire par org (RFC 0002). Clés = catalogue vocab (entity_singular, entity_plural, entities_title, entity_with_dem, portal_label, provider_term, auditor_term, mission_term, finding_term, measure_term, context_banner, context_banner_sub, entity_gender). Défaut = vocabForEdition côté code.';

alter table public.organization_vocab enable row level security;

-- Lecture : own-org (résolue superviseur pour un client). Écriture : service_role only.
drop policy if exists "org_vocab_select_own" on public.organization_vocab;
create policy "org_vocab_select_own"
  on public.organization_vocab for select to authenticated
  using (org_id = coalesce(public.get_my_organization_id(), public.get_my_supervisor_org()));

-- Résolveur exposé au front (miroir de my_capabilities).
create or replace function public.my_vocab()
returns table(key text, value text)
language sql stable security definer set search_path = public as $$
  select v.key, v.value
  from public.organization_vocab v
  where v.org_id = coalesce(public.get_my_organization_id(), public.get_my_supervisor_org())
$$;

grant execute on function public.my_vocab() to authenticated;

comment on function public.my_vocab() is
  'Overrides de vocabulaire de l''org de l''appelant (own-org staff, superviseur pour un client). SECURITY DEFINER.';
