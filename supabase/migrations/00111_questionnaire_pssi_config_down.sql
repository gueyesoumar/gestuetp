-- Migration: questionnaire_pssi_config (DOWN)
-- Rollback de 00111_questionnaire_pssi_config_up.sql

-- Restaurer les options originales de CTX-02
update public.questions
set options = '["Moins de 50", "50 a 200", "200 a 500", "500 a 1000", "Plus de 1000"]'::jsonb
where template_id = '00000000-0000-0000-0000-000000000025'
  and code = 'CTX-02';

-- Désactiver les prefill_source
update public.questions
set prefill_source = null
where template_id = '00000000-0000-0000-0000-000000000025'
  and code in ('CTX-02', 'CTX-03');

-- Désactiver les show_if
update public.questions
set show_if = null
where template_id = '00000000-0000-0000-0000-000000000025'
  and code in ('CTX-05', 'ACT-02');
