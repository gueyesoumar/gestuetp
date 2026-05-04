-- Migration: assessment_findings (UP)
-- Description: Tronc commun des constats d'audit. Une finding = un constat structure
-- (classification + description + risque + recommandation + priorite + echeance proposee).
-- Remplace les textareas legacy de control_assessments (findings, recommendations, risk_notes)
-- en permettant N findings par assessment au lieu d'un seul fourre-tout.
-- Le sous-objet workflow corrective_action_requests reference desormais finding_id (cf 00100).
-- Voir HANDOFF_PORTAGE.md, refactor B et project_findings_centric.md.

create table public.assessment_findings (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.control_assessments(id) on delete cascade,
  ord smallint not null default 0,
  classification text not null check (classification in ('major_nc','minor_nc','observation','strength')),
  description text not null,
  risk text,
  recommendation text,
  priority text check (priority in ('critical','high','medium','low')),
  proposed_deadline date,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assessment_findings is
  'Constats produits lors de l''evaluation d''un controle. N findings par assessment, chacun avec sa propre classification ISO et son propre risque/recommandation.';
comment on column public.assessment_findings.ord is
  'Ordre d''affichage dans le finding card list (drag-handle UI). Demarre a 0.';
comment on column public.assessment_findings.classification is
  'Classification ISO : major_nc (NC majeure), minor_nc (NC mineure), observation, strength.';
comment on column public.assessment_findings.description is
  'Le constat lui-meme. Format Markdown limite : **gras**, *italique*, listes a puces, `code` inline. Pas de titres, liens, images, ni HTML brut. Rendu cote UI via react-markdown avec allowedElements strict.';
comment on column public.assessment_findings.risk is
  'Risque associe au constat. Souvent vide pour observation/strength. Meme format Markdown limite.';
comment on column public.assessment_findings.recommendation is
  'Recommandation pour corriger le constat. Souvent vide pour observation/strength. Meme format Markdown limite.';
comment on column public.assessment_findings.priority is
  'Priorite suggeree (critical / high / medium / low). Editable par l''auditeur, pre-rempli depuis classification.';
comment on column public.assessment_findings.proposed_deadline is
  'Date d''echeance proposee pour la correction. Peut etre repercutee sur un CAR si le finding genere une demande d''action corrective.';
comment on column public.assessment_findings.ai_generated is
  'true si le finding a ete genere par smart-analyse. Permet de tracer les constats IA et de les revoir specifiquement.';

create index idx_findings_assessment on public.assessment_findings(assessment_id);
create index idx_findings_classification on public.assessment_findings(classification);

create trigger trg_assessment_findings_updated_at
  before update on public.assessment_findings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.assessment_findings enable row level security;

-- 1. L'auditeur affecte peut voir tous les findings de ses assessments (peu importe le statut)
create policy "findings_select_auditor"
  on public.assessment_findings for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      where ca.id = assessment_findings.assessment_id
        and ca.auditor_id in (select id from public.users where auth_id = auth.uid())
    )
  );

-- 2. L'auditeur peut INSERT/UPDATE/DELETE uniquement quand l'assessment est editable (draft ou rejected)
create policy "findings_modify_auditor"
  on public.assessment_findings for all
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      where ca.id = assessment_findings.assessment_id
        and ca.auditor_id in (select id from public.users where auth_id = auth.uid())
        and ca.status in ('draft', 'rejected')
    )
  )
  with check (
    exists (
      select 1 from public.control_assessments ca
      where ca.id = assessment_findings.assessment_id
        and ca.auditor_id in (select id from public.users where auth_id = auth.uid())
        and ca.status in ('draft', 'rejected')
    )
  );

-- 3. Le chef de mission et l'associe peuvent voir tous les findings de la mission
create policy "findings_select_lead_associate"
  on public.assessment_findings for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      join public.missions m on m.id = ca.mission_id
      join public.users u on u.auth_id = auth.uid()
      where ca.id = assessment_findings.assessment_id
        and (m.lead_auditor_id = u.id or m.associate_id = u.id)
    )
  );

-- 4. Le client peut voir les findings d'assessments approuves en interne ou en revue
create policy "findings_select_client"
  on public.assessment_findings for select
  to authenticated
  using (
    exists (
      select 1 from public.control_assessments ca
      join public.missions m on m.id = ca.mission_id
      join public.users u on u.organization_id = m.client_id
      where ca.id = assessment_findings.assessment_id
        and u.auth_id = auth.uid()
        and u.is_active = true
        and ca.status in ('approved', 'in_review')
    )
  );
