-- Migration: documents_bucket_scope (UP)
-- Sévérité : CRITIQUE (audit OWASP 2026-08-11, constat E5 -> C2 / A01).
--
-- Problème confirmé sur la base live :
--   1. Le bucket `documents` (preuves d'audit, documents clients) est `public = true`
--      -> lisible par URL publique SANS authentification
--         (/storage/v1/object/public/documents/missions/<missionId>/<fichier>).
--   2. Ses policies `storage.objects` ne scopent que par `bucket_id = 'documents'`
--      (authenticated_read / authenticated_upload) -> tout utilisateur authentifié
--      (n'importe quel cabinet, voire un client portail) peut LISTER, TÉLÉCHARGER
--      et INJECTER/ÉCRASER les preuves de TOUTES les missions de TOUS les tenants.
--
-- Les fichiers suivent le chemin `missions/<missionId>/<timestamp>_<nom>` (staff via
-- useMissionDocuments, client via useClientEvidenceUpload). On scope donc l'accès par
-- `missionId` (segment [2] du chemin), en miroir des policies de la table `documents` :
--   - staff  : missionId ∈ get_my_mission_ids()
--   - client : missionId ∈ get_my_client_mission_ids()
--   - super-admin : is_platform_owner()
-- Aucun `getPublicUrl('documents')` dans le code -> le passage en privé n'impacte
-- pas l'app (lecture via createSignedUrl, compatible bucket privé).

-- 1. Bucket privé : coupe l'accès par URL publique non authentifiée.
update storage.buckets set public = false where id = 'documents';

-- 2. Helper d'autorisation (DRY). SECURITY INVOKER (défaut) : s'appuie sur les
--    helpers definer get_my_mission_ids / get_my_client_mission_ids / is_platform_owner
--    qui résolvent l'appelant via auth.uid(). storage.foldername est schéma-qualifié.
create or replace function public.can_access_document_object(object_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select (storage.foldername(object_name))[1] = 'missions'
     and (
          exists (select 1 from public.get_my_mission_ids() gm
                  where gm::text = (storage.foldername(object_name))[2])
       or exists (select 1 from public.get_my_client_mission_ids() cm
                  where cm::text = (storage.foldername(object_name))[2])
       or public.is_platform_owner()
     );
$$;

comment on function public.can_access_document_object(text) is
  'Autorise l''accès à un objet du bucket documents si son chemin missions/<missionId>/… correspond à une mission visible par l''appelant (staff, client ou platform owner). Constat C2 (OWASP A01).';

-- 3. Remplacer les policies bucket_id-seul par des policies scopées par mission.
drop policy if exists "authenticated_read"   on storage.objects;
drop policy if exists "authenticated_upload" on storage.objects;
drop policy if exists "documents_select_scoped" on storage.objects;
drop policy if exists "documents_insert_scoped" on storage.objects;
drop policy if exists "documents_update_scoped" on storage.objects;
drop policy if exists "documents_delete_scoped" on storage.objects;

create policy "documents_select_scoped" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.can_access_document_object(name));

create policy "documents_insert_scoped" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_access_document_object(name));

create policy "documents_update_scoped" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.can_access_document_object(name))
  with check (bucket_id = 'documents' and public.can_access_document_object(name));

create policy "documents_delete_scoped" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.can_access_document_object(name));
