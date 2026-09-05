-- Migration: bucket Storage help-media (DOWN)

drop policy if exists "help_media_public_read" on storage.objects;
drop policy if exists "help_media_owner_insert" on storage.objects;
drop policy if exists "help_media_owner_update" on storage.objects;
drop policy if exists "help_media_owner_delete" on storage.objects;
delete from storage.objects where bucket_id = 'help-media';
delete from storage.buckets where id = 'help-media';
