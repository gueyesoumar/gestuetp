-- Migration: audit_history (UP)
-- Description: Historique des audits précédents par client

create table public.audit_history (
  id uuid primary key default gen_random_uuid(),
  cabinet_client_id uuid not null references public.cabinet_clients(id) on delete cascade,
  year integer not null,
  framework_name text not null,
  score integer,
  findings_count integer,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.audit_history is 'Historique des audits précédents réalisés chez un client';

create index idx_ah_client on public.audit_history(cabinet_client_id);

alter table public.audit_history enable row level security;

create policy "ah_select_cabinet"
  on public.audit_history for select
  to authenticated
  using (
    cabinet_client_id in (
      select id from public.cabinet_clients
      where cabinet_id = public.get_my_organization_id()
    )
  );

create policy "ah_insert_cabinet"
  on public.audit_history for insert
  to authenticated
  with check (
    cabinet_client_id in (
      select id from public.cabinet_clients
      where cabinet_id = public.get_my_organization_id()
    )
  );

create policy "ah_delete_cabinet"
  on public.audit_history for delete
  to authenticated
  using (
    cabinet_client_id in (
      select id from public.cabinet_clients
      where cabinet_id = public.get_my_organization_id()
    )
  );
