-- 00263 — Crée le bucket Storage `documents` s'il manque.
-- Ce bucket avait été créé manuellement en production, hors du système de migration :
-- il est donc absent des environnements provisionnés par migrate.sh (staging/dev),
-- d'où « Bucket not found » à l'upload d'une preuve. Les policies RLS associées
-- existent déjà (mig 00169) et scopent par bucket_id = 'documents'.
-- Idempotent : no-op là où le bucket existe déjà (prod).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 33554432, null)  -- privé, 32 Mo, tous types (validés côté app/edge)
on conflict (id) do nothing;
