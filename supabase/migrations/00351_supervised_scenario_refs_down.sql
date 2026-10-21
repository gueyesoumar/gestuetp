-- 00351 (DOWN) - restaure create_supervised_scenario sans threat_ref/feared_event_ref (00349).
drop function if exists public.create_supervised_scenario(uuid, text, text, int, int, text, text, text, uuid, uuid);

create or replace function public.create_supervised_scenario(
  p_org uuid, p_title text, p_dimension text, p_likelihood int, p_impact int,
  p_description text default null, p_vulnerability text default null, p_treatment text default 'untreated')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_label text;
begin
  if coalesce(btrim(p_title), '') = '' then raise exception 'Intitulé requis'; end if;
  if p_dimension is null or btrim(p_dimension) = '' then raise exception 'Dimension requise'; end if;
  if p_likelihood is null or p_likelihood not between 1 and 4
     or p_impact is null or p_impact not between 1 and 4 then raise exception 'Cotation invalide (1 à 4)'; end if;
  if not public.can_supervise_org(p_org) then raise exception 'Non autorisé : aucune relation de supervision active.'; end if;

  insert into public.risk_scenarios
    (organization_id, title, description, dimension, vulnerability,
     inherent_likelihood, inherent_impact, treatment, source, created_by)
  values
    (p_org, btrim(p_title), p_description, p_dimension::public.score_dimension, p_vulnerability,
     p_likelihood, p_impact, coalesce(nullif(btrim(p_treatment), ''), 'untreated'), 'regulator', public.get_my_user_id())
  returning id into v_id;

  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_label from public.users where id = public.get_my_user_id();
  insert into public.activity_log
    (organization_id, actor_user_id, actor_label, action, target_type, target_id, target_label, source)
  values
    (p_org, public.get_my_user_id(), v_label, 'risk.scenario.created_by_supervisor', 'risk_scenario', v_id, left(btrim(p_title), 120), 'system');

  return v_id;
end $$;
revoke all on function public.create_supervised_scenario(uuid, text, text, int, int, text, text, text) from public;
grant execute on function public.create_supervised_scenario(uuid, text, text, int, int, text, text, text) to authenticated;
