-- Migration: assessment_findings_backfill (UP)
-- Description: Rewire corrective_action_requests vers assessment_findings + backfill
-- des donnees historiques (CAR existants + textareas legacy de control_assessments).
-- Voir HANDOFF_PORTAGE.md, refactor B (option 2 : tronc commun findings + sous-objet CAR).
--
-- IMPORTANT : ce script utilise des CTE data-modifying (pas de TEMP TABLE) pour
-- compatibilite avec Supabase Studio SQL Editor qui ne preserve pas les TEMP TABLE
-- entre statements. Le script est aussi entierement IDEMPOTENT (IF NOT EXISTS, guards
-- WHERE finding_id IS NULL et NOT EXISTS) donc re-runnable sans creer de doublons.

-- ============================================================================
-- ETAPE 1 : Ajouter finding_id sur corrective_action_requests (nullable, idempotent)
-- ============================================================================
-- Pour la transition on garde aussi assessment_id sur CAR. La NOT NULL sur finding_id
-- sera appliquee une fois que generate-action-plan aura ete refactore (vague suivante).

alter table public.corrective_action_requests
  add column if not exists finding_id uuid references public.assessment_findings(id) on delete set null;

comment on column public.corrective_action_requests.finding_id is
  'FK vers assessment_findings : le constat parent dont ce CAR materialise le workflow client + verification. Nullable transitoire ; sera NOT NULL une fois generate-action-plan refactore.';

create index if not exists idx_car_finding on public.corrective_action_requests(finding_id);

-- ============================================================================
-- ETAPE 2 : Backfill - 1 finding miroir par CAR existant (CTE data-modifying)
-- ============================================================================
-- Strategie : CTE "staged" genere les UUID upfront pour chaque CAR sans finding_id,
-- puis CTE "inserted" cree les findings, puis l'UPDATE final lie CAR a son finding.
-- Toutes les CTE voient le meme snapshot de la base, donc pas de course critique.
-- WHERE car.finding_id is null garantit l'idempotence (pas de doublons au re-run).

with staged as (
  select
    car.id                                                                            as car_id,
    gen_random_uuid()                                                                 as new_finding_id,
    car.assessment_id,
    car.finding_classification                                                        as classification,
    coalesce(nullif(trim(car.description), ''), 'Constat migré (description manquante)') as description,
    case car.finding_classification
      when 'major_nc'    then 'critical'
      when 'minor_nc'    then 'high'
      when 'observation' then 'medium'
      else null
    end                                                                               as priority,
    car.deadline                                                                      as proposed_deadline,
    ((row_number() over (partition by car.assessment_id order by car.created_at, car.id)) - 1)::smallint as ord,
    car.created_at,
    car.updated_at
  from public.corrective_action_requests car
  where car.finding_id is null
),
inserted as (
  insert into public.assessment_findings (
    id, assessment_id, classification, description, priority,
    proposed_deadline, ai_generated, ord, created_at, updated_at
  )
  select
    new_finding_id, assessment_id, classification, description, priority,
    proposed_deadline, false, ord, created_at, updated_at
  from staged
  returning id
)
update public.corrective_action_requests car
set finding_id = staged.new_finding_id
from staged
where car.id = staged.car_id
  and car.finding_id is null;

-- ============================================================================
-- ETAPE 3 : Backfill - assessments avec textareas legacy mais sans CAR ni finding
-- ============================================================================
-- Pour preserver les notes d'audit historiques qui n'ont jamais ete elevees en CAR
-- (observations, strengths, NC pre-feature CAR). Une seule finding cree par assessment
-- avec les anciens textareas concatenes selon leur semantique (description / risk / recommendation).
-- Idempotent grace au double NOT EXISTS (pas de CAR + pas deja une finding).

insert into public.assessment_findings (
  assessment_id, classification, description, risk, recommendation,
  priority, ai_generated, ord, created_at, updated_at
)
select
  ca.id,
  coalesce(ca.finding_classification, 'observation'),
  coalesce(nullif(trim(ca.findings), ''), '— Notes legacy migrées —'),
  nullif(trim(ca.risk_notes), ''),
  nullif(trim(ca.recommendations), ''),
  case coalesce(ca.finding_classification, 'observation')
    when 'major_nc'    then 'critical'
    when 'minor_nc'    then 'high'
    when 'observation' then 'medium'
    when 'strength'    then 'low'
    else 'medium'
  end,
  false,
  0::smallint,
  ca.created_at,
  ca.updated_at
from public.control_assessments ca
where (
    (ca.findings is not null and trim(ca.findings) <> '')
    or (ca.recommendations is not null and trim(ca.recommendations) <> '')
    or (ca.risk_notes is not null and trim(ca.risk_notes) <> '')
  )
  and not exists (
    select 1 from public.corrective_action_requests car
    where car.assessment_id = ca.id
  )
  and not exists (
    select 1 from public.assessment_findings af
    where af.assessment_id = ca.id
  );

-- ============================================================================
-- Note : on ne drop PAS les colonnes legacy de control_assessments
-- (findings, recommendations, risk_notes, finding_classification, ai_draft).
-- Elles sont gardees pour rollback et seront drop dans une vague ulterieure
-- une fois que tout l'UI consomme assessment_findings.
-- ============================================================================
