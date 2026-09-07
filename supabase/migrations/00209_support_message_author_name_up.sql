-- Migration: nom d'auteur denormalise sur support_messages (UP)
-- Le demandeur ne peut pas toujours lire la ligne users du repondant (RLS,
-- compte super-admin d'une autre org) -> on fige le nom a l'insertion via un
-- trigger SECURITY DEFINER (lecture users cote serveur), affichable par tous.

alter table public.support_messages add column author_name text;

-- Backfill des messages existants.
update public.support_messages sm
  set author_name = nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '')
  from public.users u
  where u.id = sm.author_user_id;

create or replace function public.set_support_message_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into new.author_name
    from public.users
    where id = new.author_user_id;
  if new.author_name is null then
    new.author_name := 'Utilisateur';
  end if;
  return new;
end;
$$;

create trigger trg_support_message_author
  before insert on public.support_messages
  for each row execute function public.set_support_message_author_name();
