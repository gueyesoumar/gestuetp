-- Migration: member_role_sync (UP)
-- Description: Single source of truth pour lead_auditor / associate.
--
-- Avant cette migration : missions.lead_auditor_id et missions.associate_id
-- d'un côté, mission_members.role = 'lead_auditor' / 'associate' de l'autre.
-- Les deux pouvaient désynchroniser quand on ajoutait un membre via
-- TeamManagementModal sans passer par l'édition de la mission.
--
-- Après : triggers bidirectionnels qui maintiennent la cohérence.
--   - Ajouter un membre avec role='associate' → met à jour missions.associate_id
--   - Modifier missions.associate_id → met à jour mission_members.role
--   - Suppression / changement de rôle → mirroré
--
-- Anti-récursion : pg_trigger_depth() > 1 court-circuite le cascade.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. BACKFILL — réconcilier les états existants (missions = autorité sur conflit)
-- ════════════════════════════════════════════════════════════════════════════

-- 1a. Pour chaque mission avec lead_auditor_id défini, garantir mission_members
insert into public.mission_members (mission_id, user_id, role)
select id, lead_auditor_id, 'lead_auditor'::public.mission_role
from public.missions
where lead_auditor_id is not null
on conflict (mission_id, user_id) do update set role = excluded.role;

-- 1b. Idem associate
insert into public.mission_members (mission_id, user_id, role)
select id, associate_id, 'associate'::public.mission_role
from public.missions
where associate_id is not null
on conflict (mission_id, user_id) do update set role = excluded.role;

-- 1c. Demote tout lead_auditor qui n'est pas le lead officiel (downgrade vers 'auditor')
update public.mission_members mm
set role = 'auditor'
from public.missions m
where mm.mission_id = m.id
  and mm.role = 'lead_auditor'
  and m.lead_auditor_id is not null
  and mm.user_id <> m.lead_auditor_id;

-- 1d. Idem associate
update public.mission_members mm
set role = 'auditor'
from public.missions m
where mm.mission_id = m.id
  and mm.role = 'associate'
  and m.associate_id is not null
  and mm.user_id <> m.associate_id;

-- 1e. Pour les missions où lead_auditor_id est null mais un membre a déjà role='lead_auditor',
--     promouvoir ce membre comme lead officiel (1 seul, le plus ancien)
update public.missions m
set lead_auditor_id = sub.user_id
from (
  select distinct on (mission_id) mission_id, user_id
  from public.mission_members
  where role = 'lead_auditor'
  order by mission_id, created_at asc
) sub
where m.id = sub.mission_id
  and m.lead_auditor_id is null;

-- 1f. Idem associate
update public.missions m
set associate_id = sub.user_id
from (
  select distinct on (mission_id) mission_id, user_id
  from public.mission_members
  where role = 'associate'
  order by mission_id, created_at asc
) sub
where m.id = sub.mission_id
  and m.associate_id is null;

-- 1g. Si plusieurs lead_auditor existaient pour la même mission, ne garder que celui pointé par missions.lead_auditor_id
--     (les autres ont été downgrade en 1c, mais si missions.lead_auditor_id était null on avait promu un seul en 1e)
update public.mission_members mm
set role = 'auditor'
from public.missions m
where mm.mission_id = m.id
  and mm.role = 'lead_auditor'
  and (m.lead_auditor_id is null or mm.user_id <> m.lead_auditor_id);

-- 1h. Idem associate
update public.mission_members mm
set role = 'auditor'
from public.missions m
where mm.mission_id = m.id
  and mm.role = 'associate'
  and (m.associate_id is null or mm.user_id <> m.associate_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. TRIGGER : missions → mission_members
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.sync_lead_associate_to_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Anti-récursion : si on est déjà dans un cascade, ne rien faire
  if pg_trigger_depth() > 1 then return new; end if;

  -- ─── LEAD AUDITOR ───
  if (TG_OP = 'INSERT' and new.lead_auditor_id is not null)
     or (TG_OP = 'UPDATE' and new.lead_auditor_id is distinct from old.lead_auditor_id)
  then
    -- Downgrade l'ancien lead vers 'auditor' (sauf si retiré complètement)
    if TG_OP = 'UPDATE' and old.lead_auditor_id is not null then
      update public.mission_members
      set role = 'auditor'
      where mission_id = new.id
        and user_id = old.lead_auditor_id
        and role = 'lead_auditor';
    end if;
    -- Promote le nouveau lead
    if new.lead_auditor_id is not null then
      insert into public.mission_members (mission_id, user_id, role)
      values (new.id, new.lead_auditor_id, 'lead_auditor')
      on conflict (mission_id, user_id) do update set role = 'lead_auditor';
    end if;
  end if;

  -- ─── ASSOCIATE ───
  if (TG_OP = 'INSERT' and new.associate_id is not null)
     or (TG_OP = 'UPDATE' and new.associate_id is distinct from old.associate_id)
  then
    if TG_OP = 'UPDATE' and old.associate_id is not null then
      update public.mission_members
      set role = 'auditor'
      where mission_id = new.id
        and user_id = old.associate_id
        and role = 'associate';
    end if;
    if new.associate_id is not null then
      insert into public.mission_members (mission_id, user_id, role)
      values (new.id, new.associate_id, 'associate')
      on conflict (mission_id, user_id) do update set role = 'associate';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.sync_lead_associate_to_members() is
  'Trigger AFTER missions INSERT/UPDATE — propage lead_auditor_id / associate_id vers mission_members.';

drop trigger if exists trg_sync_lead_associate_to_members on public.missions;
create trigger trg_sync_lead_associate_to_members
  after insert or update on public.missions
  for each row execute function public.sync_lead_associate_to_members();

-- ════════════════════════════════════════════════════════════════════════════
-- 3. TRIGGER : mission_members → missions
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.sync_member_role_to_mission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  -- ─── INSERT ───
  if TG_OP = 'INSERT' then
    if new.role = 'lead_auditor' then
      update public.missions set lead_auditor_id = new.user_id where id = new.mission_id;
    elsif new.role = 'associate' then
      update public.missions set associate_id = new.user_id where id = new.mission_id;
    end if;
    return new;
  end if;

  -- ─── UPDATE ───
  if TG_OP = 'UPDATE' then
    -- Si role changé vers lead_auditor / associate
    if new.role = 'lead_auditor' and old.role <> 'lead_auditor' then
      update public.missions set lead_auditor_id = new.user_id where id = new.mission_id;
    elsif new.role = 'associate' and old.role <> 'associate' then
      update public.missions set associate_id = new.user_id where id = new.mission_id;
    end if;
    -- Si role changé DEPUIS lead_auditor / associate vers autre chose
    if old.role = 'lead_auditor' and new.role <> 'lead_auditor' then
      update public.missions
      set lead_auditor_id = null
      where id = new.mission_id
        and lead_auditor_id = old.user_id;
    elsif old.role = 'associate' and new.role <> 'associate' then
      update public.missions
      set associate_id = null
      where id = new.mission_id
        and associate_id = old.user_id;
    end if;
    return new;
  end if;

  -- ─── DELETE ───
  if TG_OP = 'DELETE' then
    if old.role = 'lead_auditor' then
      update public.missions
      set lead_auditor_id = null
      where id = old.mission_id
        and lead_auditor_id = old.user_id;
    elsif old.role = 'associate' then
      update public.missions
      set associate_id = null
      where id = old.mission_id
        and associate_id = old.user_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

comment on function public.sync_member_role_to_mission() is
  'Trigger AFTER mission_members INSERT/UPDATE/DELETE — propage le rôle lead_auditor / associate vers missions.';

drop trigger if exists trg_sync_member_role_to_mission on public.mission_members;
create trigger trg_sync_member_role_to_mission
  after insert or update or delete on public.mission_members
  for each row execute function public.sync_member_role_to_mission();
