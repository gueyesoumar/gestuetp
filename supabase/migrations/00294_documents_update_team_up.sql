-- Permet aux membres de la mission de mettre à jour les documents de leur mission.
-- Nécessaire au levier L3 : rattacher un document de cadrage à une preuve attendue
-- (poser documents.evidence_item_id). Symétrique de leurs droits insert/delete.
create policy "documents_update_team"
  on public.documents for update
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = documents.mission_id
        and u.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = documents.mission_id
        and u.auth_id = auth.uid()
    )
  );
