-- 00269 — Bibliothèque de constats-types réutilisables (Lot 3, catalogue lié / mémoire du cabinet).
--
-- Un constat-type porte SES risques et SES recommandations associés (d'où le « lié » : choisir
-- le constat adapte les risques/recos proposés). Deux portées :
--   - 'platform' : fourni par Gëstu, lisible par tous les comptes authentifiés (org_id NULL) ;
--   - 'cabinet'  : capitalisé par un cabinet, cloisonné à son org (org_id = organisation).
-- Granularité : par contrôle (control_id). Écriture cabinet réservée au staff de l'org.

create table public.finding_templates (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('platform', 'cabinet')),
  org_id uuid references public.organizations(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  classification text not null check (classification in ('major_nc', 'minor_nc', 'observation', 'strength')),
  description text not null,
  risks text[] not null default '{}',
  recommendations text[] not null default '{}',
  usage_count integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cohérence de portée : plateforme sans org, cabinet avec org.
  constraint chk_ft_scope_org check (
    (scope = 'platform' and org_id is null) or (scope = 'cabinet' and org_id is not null)
  )
);

comment on table public.finding_templates is
  'Constats-types réutilisables (catalogue lié). scope=platform (Gëstu, org_id NULL) ou cabinet (org_id = cabinet). Chaque ligne porte ses risques/recos associés.';

create index idx_finding_templates_control on public.finding_templates(control_id);
create index idx_finding_templates_org on public.finding_templates(org_id) where org_id is not null;

create trigger trg_finding_templates_updated_at
  before update on public.finding_templates
  for each row execute function public.set_updated_at();

alter table public.finding_templates enable row level security;

-- Lecture : plateforme pour tous les authentifiés ; cabinet uniquement pour mon organisation.
create policy ft_select on public.finding_templates for select to authenticated
  using (scope = 'platform' or org_id = public.get_my_organization_id());

-- Écriture cabinet par le staff de l'org (jamais les clients, jamais une autre org, jamais 'platform').
create policy ft_insert on public.finding_templates for insert to authenticated
  with check (scope = 'cabinet' and org_id = public.get_my_organization_id() and not public.is_client_role());

create policy ft_update on public.finding_templates for update to authenticated
  using (scope = 'cabinet' and org_id = public.get_my_organization_id() and not public.is_client_role())
  with check (scope = 'cabinet' and org_id = public.get_my_organization_id() and not public.is_client_role());

create policy ft_delete on public.finding_templates for delete to authenticated
  using (scope = 'cabinet' and org_id = public.get_my_organization_id() and not public.is_client_role());

-- ---- SEED plateforme : starter ISO 27001 (constats-types liés) ----
-- Résolution du control_id par code au sein du framework ISO 27001 (00000000-...-010).

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'major_nc',
  'Les comptes à privilèges ne font l''objet d''aucune revue périodique.',
  ARRAY['Accès indus persistants exploitables par un collaborateur ou un tiers.', 'Maintien de droits excessifs non détecté pendant des mois.'],
  ARRAY['Mettre en place une revue trimestrielle des accès à privilèges, tracée et validée.', 'Définir un processus formel d''attribution et de retrait des droits admin.']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'minor_nc',
  'La revue des accès à privilèges existe mais n''est pas formellement tracée.',
  ARRAY['Revue incomplète ou non reproductible : des écarts passent inaperçus.'],
  ARRAY['Formaliser et horodater la procédure de revue, avec validation du responsable.']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.2' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'minor_nc',
  'La politique de contrôle d''accès n''est pas revue à intervalle défini.',
  ARRAY['Divergence progressive entre les droits réels et la politique.'],
  ARRAY['Définir une revue annuelle de la politique de contrôle d''accès.']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.5.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'observation',
  'Un outil de gestion centralisée des accès est en cours de déploiement.',
  ARRAY[]::text[], ARRAY[]::text[]
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.5.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'major_nc',
  'L''authentification multifacteur n''est pas exigée pour les accès sensibles.',
  ARRAY['Compromission d''un compte par vol ou réutilisation de mot de passe.'],
  ARRAY['Imposer l''authentification multifacteur sur les accès à privilèges et distants.']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'minor_nc',
  'La politique de mots de passe est en deçà des exigences (longueur, rotation).',
  ARRAY['Mots de passe faibles vulnérables aux attaques par force brute.'],
  ARRAY['Aligner la politique de mots de passe sur l''état de l''art (longueur, complexité, anti-rejeu).']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.5' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'major_nc',
  'Les actions des comptes administrateurs ne sont pas journalisées.',
  ARRAY['Impossibilité d''imputer une action malveillante (perte d''imputabilité).', 'Non-détection d''un incident de sécurité interne.'],
  ARRAY['Activer la journalisation des actions privilégiées.', 'Centraliser et protéger les journaux (intégrité, rétention).']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'minor_nc',
  'Les journaux sont collectés mais ne font l''objet d''aucune revue régulière.',
  ARRAY['Détection tardive des événements de sécurité.'],
  ARRAY['Définir une revue périodique des journaux et des alertes associées.']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.15' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'major_nc',
  'Les sauvegardes ne sont pas testées par des restaurations périodiques.',
  ARRAY['Sauvegardes inexploitables le jour d''un sinistre (perte de données).'],
  ARRAY['Planifier des tests de restauration réguliers et tracés.']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.13' and d.framework_id = '00000000-0000-0000-0000-000000000010';

insert into public.finding_templates (scope, control_id, classification, description, risks, recommendations)
select 'platform', c.id, 'minor_nc',
  'La fréquence des sauvegardes n''est pas alignée sur les objectifs de reprise (RPO).',
  ARRAY['Perte de données supérieure au seuil acceptable en cas d''incident.'],
  ARRAY['Aligner la fréquence des sauvegardes sur le RPO défini par le métier.']
from public.controls c join public.domains d on c.domain_id = d.id
where c.code = 'A.8.13' and d.framework_id = '00000000-0000-0000-0000-000000000010';
