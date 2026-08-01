-- Seed: question_controls pour ISO 27001 (questionnaire v1, codes Q01-Q15)
-- Description: Lie les 15 questions du questionnaire de cadrage ISO 27001 v1 aux controles
-- Annex A pertinents. Active la carte "Reponses cadrage liees" du workspace Phase 4
-- et enrichit le contexte du prompt smart-analyse.
--
-- Format poids :
--   3 = preuve forte (la question teste DIRECTEMENT le controle)
--   2 = partiel (la question informe utilement l'evaluation)
--   1 = contexte (la question donne du contexte general)
--
-- Total : 18 mappings selectifs.
-- Questions non mappees : Q01 (activite), Q02 (effectifs), Q03 (sites), Q05 (date certif),
-- Q09 (SI principaux), Q15 (enjeux mission). Elles servent au contexte global,
-- pas a un controle particulier.
--
-- Si la v2 du questionnaire (015_iso27001_questionnaire_v2.sql avec codes GOV/MAT/OPS/...)
-- est appliquee plus tard, ce seed devra etre re-rewrite avec les nouveaux codes.
--
-- Idempotent : ON CONFLICT DO UPDATE permet de relancer le seed pour ajuster les poids.

insert into public.question_controls (question_id, control_id, weight)
select q.id, c.id, m.weight::smallint
from (values
  -- Q04 : Certification ISO 27001 existante ?
  ('Q04', 'A.5.31', 1), -- Contexte : exigences legales/reglementaires/contractuelles
  ('Q04', 'A.5.36', 1), -- Contexte : posture de conformite

  -- Q06 : RSSI ou equivalent nomme ?
  ('Q06', 'A.5.2', 3),  -- Direct : roles et responsabilites SI
  ('Q06', 'A.5.3', 2),  -- Le RSSI permet la separation des taches

  -- Q07 : Comite de securite SSI ?
  ('Q07', 'A.5.4', 3),  -- Direct : responsabilites de la direction
  ('Q07', 'A.5.2', 2),  -- Gouvernance / roles

  -- Q08 : Politique de securite formalisee ?
  ('Q08', 'A.5.1', 3),  -- Direct : politiques SI
  ('Q08', 'A.5.36', 2), -- La PSSI conditionne la conformite

  -- Q10 : Services cloud utilises ?
  ('Q10', 'A.5.23', 2), -- Information security for use of cloud services

  -- Q11 : Inventaire des actifs ?
  ('Q11', 'A.5.9', 3),  -- Direct : inventaire des informations et actifs

  -- Q12 : Analyse de risques recente ?
  ('Q12', 'A.5.7', 2),  -- Threat intelligence (composante de l'AdR)
  ('Q12', 'A.8.8', 2),  -- Gestion des vulnerabilites (sortie de l'AdR)
  ('Q12', 'A.5.30', 1), -- ICT readiness BC (l'AdR alimente le PCA)

  -- Q13 : Incidents au cours des 12 derniers mois ?
  ('Q13', 'A.5.24', 2), -- Planning de gestion d'incidents
  ('Q13', 'A.5.27', 2), -- Apprentissage post-incident

  -- Q14 : Plan de continuite (PCA/PRA) ?
  ('Q14', 'A.5.29', 3), -- Direct : securite pendant disruption
  ('Q14', 'A.5.30', 3), -- Direct : ICT readiness for business continuity
  ('Q14', 'A.8.13', 2)  -- Composante PCA : backup
) as m(q_code, c_code, weight)
join public.questions q
  on q.code = m.q_code
  and q.template_id = '00000000-0000-0000-0000-000000000020'
join public.controls c
  on c.code = m.c_code
join public.domains d
  on d.id = c.domain_id
  and d.framework_id = '00000000-0000-0000-0000-000000000010'
on conflict (question_id, control_id) do update set weight = excluded.weight;
