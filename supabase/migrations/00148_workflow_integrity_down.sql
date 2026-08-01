-- 00148 (DOWN) — restaure l'état antérieur.

-- B3 : restaurer ON DELETE CASCADE + NOT NULL (échoue si des auditor_id NULL existent — protège contre une perte silencieuse).
alter table public.control_assessments drop constraint if exists control_assessments_auditor_id_fkey;
alter table public.control_assessments alter column auditor_id set not null;
alter table public.control_assessments
  add constraint control_assessments_auditor_id_fkey
  foreign key (auditor_id) references public.users(id) on delete cascade;

-- B2 : retirer la garde de transitions.
drop trigger if exists trg_missions_status_guard on public.missions;
drop function if exists public.missions_status_transition_guard();

-- B1 : restaurer les policies client sans borne de phase.
drop policy if exists "cp_assessments_select" on public.control_assessments;
create policy "cp_assessments_select"
  on public.control_assessments for select to authenticated
  using (
    public.is_client_role()
    and mission_id in (select public.get_my_client_mission_ids())
  );

drop policy if exists "cp_findings_select" on public.assessment_findings;
create policy "cp_findings_select"
  on public.assessment_findings for select to authenticated
  using (
    public.is_client_role()
    and assessment_id in (
      select ca.id from public.control_assessments ca
      where ca.mission_id in (select public.get_my_client_mission_ids())
    )
  );
