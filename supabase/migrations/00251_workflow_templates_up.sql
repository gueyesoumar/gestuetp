-- Migration 00251 (UP) — RFC 0009 : templates de parcours (INC 1, fondation).
--
-- Permet à un CABINET de désélectionner des étapes/sous-étapes du parcours de
-- mission, via un template dont la mission FIGE un snapshot à la création (comme
-- RFC 0003 fige le moteur). INC 1 est INERTE fonctionnellement : aucun consommateur
-- ne lit encore workflow_disabled_steps (le résolveur arrive à l'INC 2).
--
-- Garde-fous : (1) CHECK liste blanche au niveau base → impossible de désélectionner
-- une phase médiane obligatoire, même par appel direct ; (2) écriture RLS réservée
-- own-org + permission can_manage_workflow. La machine à états (enum mission_status,
-- trigger 00148) n'est PAS touchée.

-- 1) Table des templates (multi-templates prête ; INC 1-4 n'exploitent que is_default)
create table public.organization_workflow_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  disabled_steps text[] not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id),
  unique (organization_id, name),
  -- Liste blanche maximale (RFC 0009 §3, décision 2) : seules ces clés sont
  -- désélectionnables. Extensible par migration ultérieure. Les phases médianes
  -- (scoping/planning/fieldwork/internal_review/closure) et le noyau des phases
  -- ne peuvent JAMAIS y figurer.
  constraint chk_workflow_template_whitelist check (
    disabled_steps <@ array[
      'client_review', 'action_plan',
      'scoping.risks', 'scoping.questionnaire', 'scoping.documents', 'scoping.actors',
      'fieldwork.observe', 'fieldwork.document', 'fieldwork.analyze', 'fieldwork.validate'
    ]::text[]
  )
);

comment on table public.organization_workflow_templates is
  'RFC 0009 : templates de parcours par cabinet (étapes/sous-étapes désélectionnées). disabled_steps borné par CHECK à la liste blanche des étapes sûres.';

create unique index uq_workflow_template_default
  on public.organization_workflow_templates(organization_id) where is_default;
create index idx_workflow_template_org
  on public.organization_workflow_templates(organization_id);

create trigger trg_workflow_template_updated_at
  before update on public.organization_workflow_templates
  for each row execute function public.set_updated_at();

-- RLS : lecture own-org (+ superadmin) ; écriture own-org + can_manage_workflow.
-- Le service_role (edge functions) contourne la RLS nativement.
alter table public.organization_workflow_templates enable row level security;

create policy "workflow_templates_select_org"
  on public.organization_workflow_templates for select to authenticated
  using (organization_id = public.get_my_organization_id() or public.is_platform_owner());

create policy "workflow_templates_insert_manage"
  on public.organization_workflow_templates for insert to authenticated
  with check (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_workflow'));

create policy "workflow_templates_update_manage"
  on public.organization_workflow_templates for update to authenticated
  using (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_workflow'))
  with check (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_workflow'));

create policy "workflow_templates_delete_manage"
  on public.organization_workflow_templates for delete to authenticated
  using (organization_id = public.get_my_organization_id() and public.has_cabinet_permission('can_manage_workflow'));

-- 2) Snapshot figé par mission
alter table public.missions
  add column if not exists workflow_disabled_steps text[] not null default '{}';
comment on column public.missions.workflow_disabled_steps is
  'RFC 0009 : snapshot FIGÉ à la création des étapes/sous-étapes désélectionnées, hérité du template is_default du cabinet. Missions existantes = {} (parcours complet).';

-- 3) Extension du trigger de snapshot (00181) : copie aussi disabled_steps du
--    template par défaut de l'org. SECURITY DEFINER → lit la table sans la RLS.
create or replace function public.mission_snapshot_workflow_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.workflow_version := coalesce(
    (select o.workflow_version from public.organizations o where o.id = new.cabinet_id),
    'audit');
  new.workflow_disabled_steps := coalesce(
    (select t.disabled_steps from public.organization_workflow_templates t
      where t.organization_id = new.cabinet_id and t.is_default limit 1),
    '{}');
  return new;
end $$;

-- 4) Nouvelle permission can_manage_workflow : accordée aux rôles déjà porteurs de
--    can_edit_organization (proxy « admin du cabinet »).
update public.platform_roles
set permissions = permissions || '{"can_manage_workflow": true}'::jsonb
where coalesce((permissions->>'can_edit_organization')::boolean, false) = true;
