-- Migration: bucket Storage help-media pour les images d'articles (UP)
-- Lecture publique (contenu d'aide non sensible), ecriture platform owner uniquement.

insert into storage.buckets (id, name, public)
values ('help-media', 'help-media', true)
on conflict (id) do nothing;

create policy "help_media_public_read"
  on storage.objects for select
  using (bucket_id = 'help-media');

create policy "help_media_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'help-media' and public.is_platform_owner());

create policy "help_media_owner_update"
  on storage.objects for update
  using (bucket_id = 'help-media' and public.is_platform_owner());

create policy "help_media_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'help-media' and public.is_platform_owner());
