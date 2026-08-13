-- 00180 — Piste d'audit (F6) : trigger générique de journalisation des writes
-- clients DIRECTS (colonne vertébrale hybride, vague 1).
--
-- Principe : la fonction ne journalise QUE si un utilisateur est authentifié
-- (auth.uid présent). Les actions passant par une Edge Function en service_role
-- (auth.uid null) sont journalisées par le helper edge logActivity() (événements
-- sémantiques) — on évite ainsi tout double comptage.
--
-- organization_id du log = organisation de l'ACTEUR (il appartient exactement à
-- l'org dont l'admin consulte la piste) → aucune jointure par-table nécessaire.
-- metadata ne stocke que les NOMS des colonnes modifiées, jamais leurs valeurs
-- (aucune fuite de secret/PII).

create or replace function public.log_activity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.get_my_user_id();
  v_org uuid;
  v_actor_label text;
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_old jsonb;
  v_target_type text := tg_argv[0];
  v_verb text;
  v_target_label text;
  v_changed text[];
begin
  -- Pas d'utilisateur en session (service_role / edge) → laissé au helper edge.
  if v_actor is null then
    return coalesce(new, old);
  end if;

  select u.organization_id, trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, ''))
    into v_org, v_actor_label
  from public.users u where u.id = v_actor;
  if v_org is null then
    return coalesce(new, old);
  end if;

  v_verb := case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
  v_target_label := coalesce(v_row->>'name', v_row->>'title', v_row->>'label');

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_changed := array(
      select key from jsonb_each(v_row)
      where v_row->key is distinct from v_old->key
        and key not in ('updated_at', 'created_at')
    );
    -- Rien de significatif n'a changé → pas d'entrée.
    if array_length(v_changed, 1) is null then
      return new;
    end if;
  end if;

  -- Fail-open : un échec de journalisation ne doit JAMAIS faire échouer l'action
  -- métier (le trigger est AFTER, dans la même transaction). On avale l'erreur et
  -- on émet un warning. Une entrée manquante ne casse pas la chaîne (le seq suivant
  -- reste max+1, prev_hash cohérent).
  begin
    insert into public.activity_log(
      organization_id, actor_user_id, actor_label, action,
      target_type, target_id, target_label, summary, metadata, source)
    values(
      v_org, v_actor, nullif(v_actor_label, ''), v_target_type || '.' || v_verb,
      v_target_type, nullif(v_row->>'id', '')::uuid, v_target_label,
      nullif(v_actor_label, '') || ' · ' || v_target_type || '.' || v_verb
        || coalesce(' « ' || v_target_label || ' »', ''),
      case when v_changed is not null then jsonb_build_object('changed', to_jsonb(v_changed)) else '{}'::jsonb end,
      'trigger');
  exception when others then
    raise warning 'log_activity_change (%.%): %', v_target_type, v_verb, sqlerrm;
  end;

  return coalesce(new, old);
end $$;

-- Attachement aux tables à écriture cliente directe (vague 1).
create trigger trg_activity_organizations
  after insert or update or delete on public.organizations
  for each row execute function public.log_activity_change('organization');

create trigger trg_activity_platform_roles
  after insert or update or delete on public.platform_roles
  for each row execute function public.log_activity_change('role');

create trigger trg_activity_missions
  after insert or update or delete on public.missions
  for each row execute function public.log_activity_change('mission');

create trigger trg_activity_cabinet_clients
  after insert or update or delete on public.cabinet_clients
  for each row execute function public.log_activity_change('client');

create trigger trg_activity_car
  after insert or update or delete on public.corrective_action_requests
  for each row execute function public.log_activity_change('action_plan');
