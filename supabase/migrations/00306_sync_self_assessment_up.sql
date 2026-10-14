-- RFC 0015 Lot 2 : génération automatique des templates d'auto-évaluation depuis les
-- contrôles d'un référentiel. Fonction idempotente + backfill de tous les référentiels.
-- Décision §8.b : auto pour tous ; resynchro via l'edge admin-framework (pas de trigger
-- brut sur controls, pour ne pas provoquer de tempêtes pendant les seeds).
--
-- Produit : 1 template kind='self_assessment' par référentiel, 1 question single_choice
-- par contrôle (code=code du contrôle, options c/pc/nc/na, expected_answer='Conforme'),
-- liée au contrôle via question_controls (poids 1). Les réponses alimentent les
-- pré-verdicts existants (expected_answer + question_controls). Inerte tant que non lancée.

create or replace function public.sync_self_assessment_template(p_framework_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tpl uuid;
  v_fw_name text;
begin
  select name into v_fw_name from public.frameworks where id = p_framework_id;
  if v_fw_name is null then return null; end if;

  -- 1. Template self_assessment (un seul par référentiel), créé ou réactivé.
  select id into v_tpl from public.questionnaire_templates
    where framework_id = p_framework_id and kind = 'self_assessment' limit 1;
  if v_tpl is null then
    insert into public.questionnaire_templates (framework_id, name, description, kind, is_active)
    values (p_framework_id, 'Auto-évaluation - ' || v_fw_name,
            'Auto-évaluation générée depuis les contrôles du référentiel.', 'self_assessment', true)
    returning id into v_tpl;
  else
    update public.questionnaire_templates
      set name = 'Auto-évaluation - ' || v_fw_name, is_active = true, updated_at = now()
      where id = v_tpl;
  end if;

  -- 2. Upsert d'une question par contrôle + 3. lien question_controls (poids 1).
  with ctrl as (
    select c.id as control_id, c.code, c.name,
           d.sort_order * 1000 + c.sort_order as ord
    from public.controls c
    join public.domains d on d.id = c.domain_id
    where d.framework_id = p_framework_id
  ),
  up as (
    insert into public.questions (template_id, code, text, question_type, options, is_required, sort_order, expected_answer)
    select v_tpl, code, name, 'single_choice',
           '["Conforme","Partiellement","Non conforme","Sans objet"]'::jsonb,
           true, ord, 'Conforme'
    from ctrl
    on conflict (template_id, code) do update
      set text = excluded.text, sort_order = excluded.sort_order,
          options = excluded.options, question_type = 'single_choice',
          expected_answer = 'Conforme', updated_at = now()
    returning id, code
  )
  insert into public.question_controls (question_id, control_id, weight)
  select up.id, ctrl.control_id, 1
  from up join ctrl on ctrl.code = up.code
  on conflict (question_id, control_id) do nothing;

  -- 4. Supprimer les questions orphelines (contrôle retiré du référentiel).
  delete from public.questions q
  where q.template_id = v_tpl
    and not exists (
      select 1 from public.controls c
      join public.domains d on d.id = c.domain_id
      where d.framework_id = p_framework_id and c.code = q.code
    );

  return v_tpl;
end;
$$;

-- Réservé au service_role (edge admin-framework) et au propriétaire (backfill).
revoke all on function public.sync_self_assessment_template(uuid) from public;
grant execute on function public.sync_self_assessment_template(uuid) to service_role;

-- Backfill : tous les référentiels existants (décision §8.b : auto pour tous).
do $$
declare r record;
begin
  for r in select id from public.frameworks loop
    perform public.sync_self_assessment_template(r.id);
  end loop;
end $$;
