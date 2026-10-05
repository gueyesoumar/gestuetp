-- 00264 — Policies DELETE manquantes sur public.documents.
-- Sans elles, la suppression REST d'un document (étape Documenter) supprime 0 ligne
-- (RLS) tout en renvoyant 204 : faux succès côté UI, le document reste affiché.
-- (Le fichier Storage est bien retiré par documents_delete_scoped — mig 00169 ;
--  seule la ligne de la table n'était jamais supprimée.)
-- Miroir des policies d'INSERT (00019) : équipe de mission + organisation cliente.
-- Pas de récursion : les policies interrogent mission_members/users/missions, jamais documents.

create policy "documents_delete_team"
  on public.documents for delete
  to authenticated
  using (
    exists (
      select 1 from public.mission_members mm
      join public.users u on u.id = mm.user_id
      where mm.mission_id = documents.mission_id
        and u.auth_id = auth.uid()
    )
  );

create policy "documents_delete_client"
  on public.documents for delete
  to authenticated
  using (
    exists (
      select 1 from public.missions m
      join public.users u on u.organization_id = m.client_id
      where m.id = documents.mission_id
        and u.auth_id = auth.uid()
        and u.is_active = true
    )
  );
