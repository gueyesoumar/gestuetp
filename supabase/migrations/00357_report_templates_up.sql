-- Migration: 00357_report_templates_up
-- Description: Templates de rapport par cabinet/client (RFC 0021 Lot 3a). Un cabinet
--   definit l'ordre et la visibilite des sections ; defaut cabinet + surcharge par
--   client. Lecture par les membres du cabinet (resolution a la generation) ; ecriture
--   gardee par can_manage_report_templates. Rendu toujours 100% client.

create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  scope text not null default 'cabinet' check (scope in ('cabinet', 'client')),
  client_id uuid references public.organizations(id) on delete cascade,
  sections jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_templates_scope_client check ((scope = 'client') = (client_id is not null))
);

create index idx_report_templates_org on public.report_templates(organization_id);
create index idx_report_templates_client on public.report_templates(client_id);
-- Au plus un defaut cabinet par org, et un template par (org, client).
create unique index uniq_report_templates_cabinet_default on public.report_templates(organization_id) where is_default and scope = 'cabinet';
create unique index uniq_report_templates_client on public.report_templates(organization_id, client_id) where scope = 'client';

create trigger trg_report_templates_updated_at
  before update on public.report_templates
  for each row execute function public.set_updated_at();

alter table public.report_templates enable row level security;

-- Lecture : membres du cabinet (pas les clients), sur leur propre org.
create policy rt_select on public.report_templates for select to authenticated
  using (not public.is_client_role() and organization_id = public.get_my_organization_id());

-- Ecriture : garde can_manage_report_templates, sur leur propre org.
create policy rt_write on public.report_templates for all to authenticated
  using (not public.is_client_role() and organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_report_templates'))
  with check (not public.is_client_role() and organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_report_templates'));

-- Backfill (strategie B, cf 00082/00347) : accorder la permission aux roles deja
-- gestionnaires (organisation ou clients). Les platform owners l'ont via l'override.
update public.platform_roles
set permissions = permissions || jsonb_build_object(
  'can_manage_report_templates',
  coalesce((permissions ->> 'can_edit_organization')::boolean, false)
  or coalesce((permissions ->> 'can_manage_clients')::boolean, false)
)
where not (permissions ? 'can_manage_report_templates');
