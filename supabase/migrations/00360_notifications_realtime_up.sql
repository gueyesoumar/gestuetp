-- RFC n°17 Lot 2 : activer Supabase Realtime sur la table notifications pour la
-- cloche en temps réel. La RLS (select own) s'applique aux changements diffusés :
-- un utilisateur ne reçoit que ses propres notifications. Idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
