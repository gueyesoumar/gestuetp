-- Migration: fil de conversation sur les tickets support (UP)
-- Table support_messages + RLS calquee sur la visibilite du ticket parent
-- + trigger SECURITY DEFINER (statut auto + notification au demandeur).

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  author_user_id uuid not null references public.users(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index idx_support_messages_request on public.support_messages(request_id, created_at);

alter table public.support_messages enable row level security;

-- Visibilite : uniquement les messages d'un ticket que je peux deja voir
-- (meme cloisonnement que support_requests, reference cross-table -> pas de recursion).
create policy "support_messages_select"
  on public.support_messages for select
  using (
    exists (
      select 1 from public.support_requests sr
      where sr.id = support_messages.request_id
        and (
          public.is_platform_owner()
          or sr.cabinet_id = public.get_my_organization_id()
          or sr.mission_id in (select public.get_my_mission_ids())
        )
    )
  );

-- Poster : en mon nom, sur un ticket que je peux voir.
create policy "support_messages_insert"
  on public.support_messages for insert
  with check (
    author_user_id = public.get_my_user_id()
    and exists (
      select 1 from public.support_requests sr
      where sr.id = support_messages.request_id
        and (
          public.is_platform_owner()
          or sr.cabinet_id = public.get_my_organization_id()
          or sr.mission_id in (select public.get_my_mission_ids())
        )
    )
  );

-- Messages immuables : aucune policy UPDATE. DELETE reserve au platform owner.
create policy "support_messages_delete_owner"
  on public.support_messages for delete
  using (public.is_platform_owner());

-- Trigger : avance le statut + notifie le demandeur. SECURITY DEFINER pour ecrire
-- dans notifications (INSERT reserve au service_role) comme le font les Edge Functions.
create or replace function public.on_support_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid;
  v_status public.support_status;
begin
  select requester_user_id, status
    into v_requester, v_status
    from public.support_requests
    where id = new.request_id;

  -- Statut auto : jamais sur un ticket resolu / ferme / escalade.
  if v_status in ('open', 'in_progress', 'answered') then
    if new.author_user_id = v_requester then
      if v_status <> 'in_progress' then
        update public.support_requests set status = 'in_progress' where id = new.request_id;
      end if;
    else
      if v_status <> 'answered' then
        update public.support_requests set status = 'answered' where id = new.request_id;
      end if;
    end if;
  end if;

  -- Notifie le demandeur quand quelqu'un d'AUTRE repond.
  if new.author_user_id <> v_requester then
    insert into public.notifications (user_id, type, title, body, link, metadata)
    values (
      v_requester,
      'support',
      'Reponse a votre demande',
      left(new.body, 140),
      '/aide',
      jsonb_build_object('request_id', new.request_id)
    );
  end if;

  return new;
end;
$$;

create trigger trg_support_message_insert
  after insert on public.support_messages
  for each row execute function public.on_support_message_insert();
