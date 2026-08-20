-- Migration 00207 (DOWN) : restauration des éditions (RFC 0006, lot 2)
--
-- Recrée la table editions + le preset, la colonne organizations.edition (best-effort :
-- 'regul' si capacité supervision active, sinon 'comply'), et get_my_edition().

create table if not exists public.editions (
  key text primary key,
  label text not null,
  capabilities public.org_capability[] not null default '{}'
);

insert into public.editions (key, label, capabilities) values
  ('comply', 'Gëstu Comply', array['comply']::public.org_capability[]),
  ('regul',  'Gëstu Regul',  array['comply','supervision','incidents','measures']::public.org_capability[]),
  ('etp',    'Gëstu ETP',     array['comply','risk','policy','privacy','awareness','supervision','incidents','measures']::public.org_capability[])
on conflict (key) do update set label = excluded.label, capabilities = excluded.capabilities;

alter table public.editions enable row level security;
drop policy if exists editions_select_all on public.editions;
create policy editions_select_all on public.editions for select to authenticated using (true);

alter table public.organizations
  add column if not exists edition text not null default 'comply' references public.editions(key);

update public.organizations o set edition = 'regul'
where exists (select 1 from public.organization_capabilities oc
              where oc.org_id = o.id and oc.capability = 'supervision' and oc.status = 'active');

create or replace function public.get_my_edition()
returns text language sql stable security definer set search_path = public as $$
  select o.edition from public.organizations o where o.id = public.get_my_organization_id();
$$;
