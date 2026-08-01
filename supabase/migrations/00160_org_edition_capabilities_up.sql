-- Migration 00160 (UP) : editions + capacites par organisation (RFC 0001, Phase 1)
--
-- Acheve l'etape 2 du RFC (« capacites derivees du produit courant ») restee non
-- faite apres 00156 (tables) / 00157 (backfill des aretes). ADDITIF, idempotent,
-- reversible. AUCUN gating n'est branche ici (c'est la Phase 2) -> ZERO changement
-- de comportement runtime : les donnees et primitives « dorment » jusqu'a leur
-- consommation par le frontend/backend en P2.
--
-- Regul n'est plus un produit : c'est une EDITION (preset de capacites). Cette
-- migration pose la fondation qui remplacera le fork VITE_PRODUCT.

-- 1. Editions (preset = DONNEE, pas code) --------------------------------------
create table if not exists public.editions (
  key text primary key,
  label text not null,
  capabilities public.org_capability[] not null default '{}'
);
comment on table public.editions is
  'Presets d''edition (RFC 0001 §3.4) : capacites activees par edition. Remplace le fork VITE_PRODUCT. Le vocabulaire/branding par edition seront ajoutes en Phase 2.';

insert into public.editions (key, label, capabilities) values
  ('comply', 'Gëstu Comply',
     array['comply']::public.org_capability[]),
  ('regul',  'Gëstu Regul',
     array['comply','supervision','incidents','measures']::public.org_capability[]),
  ('etp',    'Gëstu ETP',
     array['comply','risk','policy','privacy','awareness','supervision','incidents','measures']::public.org_capability[])
on conflict (key) do update
  set label = excluded.label, capabilities = excluded.capabilities;

-- 2. Edition par organisation --------------------------------------------------
alter table public.organizations
  add column if not exists edition text not null default 'comply'
    references public.editions(key);

-- 3. Backfill idempotent, ANCRE SUR LE GRAPHE (pas d'instance/URL en dur) -------
--    Une org actrice d'au moins une arete regulatory_supervision active supervise
--    des assujettis -> edition 'regul'. Ne tague QUE le regulateur (acteur), pas
--    les assujettis (cibles). Sur une instance Comply : aucune arete -> tout reste
--    'comply'. Env-agnostique.
update public.organizations o set edition = 'regul'
where o.edition = 'comply'
  and exists (
    select 1 from public.organization_relationships r
    where r.actor_org_id = o.id
      and r.nature = 'regulatory_supervision'
      and r.status = 'active'
  );

-- Peuplement des capacites depuis l'edition de chaque org (idempotent) ---------
insert into public.organization_capabilities (org_id, capability, status)
select o.id, cap, 'active'::public.capability_status
from public.organizations o
join public.editions e on e.key = o.edition
cross join lateral unnest(e.capabilities) as cap
on conflict (org_id, capability) do nothing;

-- 4. Primitives (lecture) ------------------------------------------------------
create or replace function public.org_has_capability(p_org uuid, p_cap public.org_capability)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_capabilities
    where org_id = p_org and capability = p_cap and status = 'active'
  );
$$;
comment on function public.org_has_capability(uuid, public.org_capability) is
  'Vrai si l''org possede la capacite (active). Base du gating Phase 2 (remplace types.includes(''group'') et VITE_PRODUCT).';

create or replace function public.get_my_edition()
returns text language sql stable security definer set search_path = public as $$
  select o.edition from public.organizations o where o.id = public.get_my_organization_id();
$$;

create or replace function public.my_capabilities()
returns setof public.org_capability language sql stable security definer set search_path = public as $$
  select capability from public.organization_capabilities
  where org_id = public.get_my_organization_id() and status = 'active';
$$;

-- 5. RLS : editions lisible par tout authenticated (presets non sensibles) ------
--    organizations.edition : deja lisible via la RLS existante de organizations.
--    organization_capabilities : deja own-read (00156). Ecritures service_role only.
alter table public.editions enable row level security;
drop policy if exists editions_select_all on public.editions;
create policy editions_select_all on public.editions
  for select to authenticated using (true);
