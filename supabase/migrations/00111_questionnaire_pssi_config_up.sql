-- Migration: questionnaire_pssi_config (UP)
-- Description: Active prefill_source et show_if sur le questionnaire PSSI-ES.
--
-- 1. Aligne CTX-02 sur EFFECTIFS_OPTIONS (src/lib/constants.ts) pour que la
--    valeur préremplie depuis cabinet_clients.effectifs corresponde à une option.
-- 2. Active le préremplissage automatique sur CTX-02 (effectif) et CTX-03 (sites).
-- 3. Cache CTX-05 (score audit précédent) sauf si CTX-04 = oui.
-- 4. Cache ACT-02 (classification) sauf si ACT-01 = oui (un inventaire existe).
--
-- ISO 27001 v2 (template 020) : aucune configuration — toutes les questions sont
-- top-level sans dépendances naturelles entre elles.

-- 1. Aligner CTX-02 sur EFFECTIFS_OPTIONS
update public.questions
set options = '["Moins de 50","50 à 250","250 à 1 000","1 000 à 5 000","Plus de 5 000"]'::jsonb
where template_id = '00000000-0000-0000-0000-000000000025'
  and code = 'CTX-02';

-- 2a. Préremplir CTX-02 depuis cabinet_clients.effectifs
update public.questions
set prefill_source = 'client.effectifs'
where template_id = '00000000-0000-0000-0000-000000000025'
  and code = 'CTX-02';

-- 2b. Préremplir CTX-03 depuis cabinet_clients.nombre_sites
update public.questions
set prefill_source = 'client.nombre_sites'
where template_id = '00000000-0000-0000-0000-000000000025'
  and code = 'CTX-03';

-- 3. Skip logic : CTX-05 visible uniquement si CTX-04 = oui
update public.questions
set show_if = '{"question_code":"CTX-04","operator":"truthy"}'::jsonb
where template_id = '00000000-0000-0000-0000-000000000025'
  and code = 'CTX-05';

-- 4. Skip logic : ACT-02 visible uniquement si ACT-01 = oui (inventaire existant)
update public.questions
set show_if = '{"question_code":"ACT-01","operator":"truthy"}'::jsonb
where template_id = '00000000-0000-0000-0000-000000000025'
  and code = 'ACT-02';
