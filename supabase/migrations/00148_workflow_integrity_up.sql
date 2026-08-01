-- 00148 — Intégrité du workflow d'audit (revue pré-audit, Lot B).
--
-- B1 (bloquant) : le portail client voit/agit sur des évaluations encore en
--   revue INTERNE. Cause : le statut `in_review` est réutilisé pour la revue
--   client (send-to-client-review). Discriminant fiable = mission.status.
--   → On borne la visibilité client aux missions réellement en revue client
--     ('client_review') ou clôturées ('closure').
-- B2 (majeur) : aucune garde sur missions.status → sauts d'étape arbitraires.
--   → Trigger validant les transitions (adjacences légitimes + retour arrière).
--     NB : la supervision continue saute 'client_review' (internal_review→closure).
-- B3 (majeur) : control_assessments.auditor_id ON DELETE CASCADE → supprimer un
--   auditeur détruit son travail. → passage en ON DELETE SET NULL (colonne nullable).

-- ── B1 : visibilité client bornée à la phase client_review/closure ────────────
drop policy if exists "cp_assessments_select" on public.control_assessments;
create policy "cp_assessments_select"
  on public.control_assessments for select to authenticated
  using (
    public.is_client_role()
    and mission_id in (select public.get_my_client_mission_ids())
    and mission_id in (select id from public.missions where status in ('client_review', 'closure'))
  );

drop policy if exists "cp_findings_select" on public.assessment_findings;
create policy "cp_findings_select"
  on public.assessment_findings for select to authenticated
  using (
    public.is_client_role()
    and assessment_id in (
      select ca.id from public.control_assessments ca
      where ca.mission_id in (select public.get_my_client_mission_ids())
        and ca.mission_id in (select id from public.missions where status in ('client_review', 'closure'))
    )
  );

-- ── B2 : garde de transitions sur missions.status ────────────────────────────
create or replace function public.missions_status_transition_guard()
returns trigger
language plpgsql
as $$
declare o int; n int;
  idx constant text[] := array['initialization','scoping','planning','fieldwork','internal_review','client_review','closure'];
  fwd constant text[] := array[
    'initialization->scoping','scoping->planning','planning->fieldwork',
    'fieldwork->internal_review','internal_review->client_review',
    'internal_review->closure','client_review->closure'
  ];
begin
  if new.status = old.status then return new; end if;
  o := array_position(idx, old.status::text);
  n := array_position(idx, new.status::text);
  if o is null or n is null then
    raise exception 'Statut de mission invalide : % -> %', old.status, new.status;
  end if;
  if n < o then return new; end if; -- retour arrière (reprise/réouverture) autorisé
  if (old.status::text || '->' || new.status::text) = any(fwd) then return new; end if;
  raise exception 'Transition de mission interdite (saut d''étape) : % -> %', old.status, new.status;
end $$;

drop trigger if exists trg_missions_status_guard on public.missions;
create trigger trg_missions_status_guard
  before update of status on public.missions
  for each row execute function public.missions_status_transition_guard();

-- ── B3 : préserver le travail d'audit si un auditeur est supprimé ─────────────
alter table public.control_assessments drop constraint if exists control_assessments_auditor_id_fkey;
alter table public.control_assessments alter column auditor_id drop not null;
alter table public.control_assessments
  add constraint control_assessments_auditor_id_fkey
  foreign key (auditor_id) references public.users(id) on delete set null;
