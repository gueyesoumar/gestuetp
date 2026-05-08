-- Migration: pv_template_backfill (UP)
-- Description: Recompose interview_schedules.pv_template pour les entretiens
-- créés avant que audit_topics.default_questions soit seedé (migration 00115).
--
-- Cible (scope agressif b) :
--   1. pv_template IS NULL
--   2. OU pv_template -> 'sections' n'est pas un array, ou est un array vide
--      (cas où l'entretien n'a aucun sujet rattaché — légitime, on laisse [])
--   3. OU toutes les sections ont questions vide
--      (cas créé entre 00114 et 00115 : structure correcte mais pas de questions)
--
-- pv_notes n'est PAS touché — la saisie utilisateur est préservée.
-- pv_template est recomposé depuis l'état actuel de :
--   - interview_topics (sujets rattachés à l'entretien)
--   - audit_topics (name + default_questions)
--   - topic_controls + controls (codes des contrôles couverts par chaque sujet)

update public.interview_schedules s
set pv_template = (
  select jsonb_build_object(
    'sections',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'topic_id', t.id,
          'topic_name', t.name,
          'control_codes', coalesce(codes.codes, '[]'::jsonb),
          'questions', coalesce(t.default_questions, '[]'::jsonb)
        )
        order by t.name
      ),
      '[]'::jsonb
    )
  )
  from public.interview_topics it
  join public.audit_topics t on t.id = it.topic_id
  left join lateral (
    select coalesce(jsonb_agg(c.code order by c.code), '[]'::jsonb) as codes
    from public.topic_controls tc
    join public.controls c on c.id = tc.control_id
    where tc.topic_id = t.id
  ) codes on true
  where it.interview_id = s.id
)
where s.pv_template is null
   or jsonb_typeof(s.pv_template -> 'sections') is distinct from 'array'
   or jsonb_array_length(s.pv_template -> 'sections') = 0
   or not exists (
     select 1
     from jsonb_array_elements(s.pv_template -> 'sections') as section
     where jsonb_typeof(section -> 'questions') = 'array'
       and jsonb_array_length(section -> 'questions') > 0
   );
