-- Retire la fonction. Les templates self_assessment générés sont supprimés
-- (ainsi que leurs questions/liens par cascade sur template_id / question_id).
delete from public.questionnaire_templates where kind = 'self_assessment';
drop function if exists public.sync_self_assessment_template(uuid);
