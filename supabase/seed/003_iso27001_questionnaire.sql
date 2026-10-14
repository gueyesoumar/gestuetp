-- Seed: Template questionnaire de prise de connaissance ISO 27001

insert into public.questionnaire_templates (id, framework_id, name, description, version)
values (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'Questionnaire de prise de connaissance - ISO 27001',
  'Questionnaire initial envoyé au client en début de mission ISO 27001',
  '1.0'
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.questions (template_id, code, text, question_type, is_required, sort_order) values
-- Contexte general
('00000000-0000-0000-0000-000000000020', 'Q01', 'Quelle est l''activité principale de votre organisation ?', 'textarea', true, 1),
('00000000-0000-0000-0000-000000000020', 'Q02', 'Combien de collaborateurs compte votre organisation ?', 'single_choice', true, 2),
('00000000-0000-0000-0000-000000000020', 'Q03', 'Combien de sites géographiques sont concernés par le périmètre ?', 'text', true, 3),
('00000000-0000-0000-0000-000000000020', 'Q04', 'Disposez-vous d''une certification ISO 27001 existante ?', 'boolean', true, 4),
('00000000-0000-0000-0000-000000000020', 'Q05', 'Si oui, quelle est la date d''expiration de la certification actuelle ?', 'text', false, 5),

-- Gouvernance
('00000000-0000-0000-0000-000000000020', 'Q06', 'Existe-t-il un RSSI ou équivalent nommé ?', 'boolean', true, 6),
('00000000-0000-0000-0000-000000000020', 'Q07', 'Existe-t-il un comité de sécurité de l''information ?', 'boolean', true, 7),
('00000000-0000-0000-0000-000000000020', 'Q08', 'Disposez-vous d''une politique de sécurité de l''information formalisée ?', 'boolean', true, 8),

-- Systeme d'information
('00000000-0000-0000-0000-000000000020', 'Q09', 'Quels sont les principaux systèmes d''information dans le périmètre ?', 'textarea', true, 9),
('00000000-0000-0000-0000-000000000020', 'Q10', 'Utilisez-vous des services cloud ? Si oui, lesquels ?', 'textarea', true, 10),
('00000000-0000-0000-0000-000000000020', 'Q11', 'Disposez-vous d''un inventaire des actifs informationnels ?', 'boolean', true, 11),
('00000000-0000-0000-0000-000000000020', 'Q12', 'Avez-vous réalisé une analyse de risques récemment ?', 'boolean', true, 12),

-- Incidents et continuite
('00000000-0000-0000-0000-000000000020', 'Q13', 'Avez-vous subi des incidents de sécurité majeurs au cours des 12 derniers mois ?', 'boolean', true, 13),
('00000000-0000-0000-0000-000000000020', 'Q14', 'Disposez-vous d''un plan de continuité d''activité (PCA/PRA) ?', 'boolean', true, 14),
('00000000-0000-0000-0000-000000000020', 'Q15', 'Quels sont vos principaux enjeux et attentes vis-à-vis de cette mission ?', 'textarea', true, 15)
on conflict (template_id, code) do update set
  text = excluded.text;

-- Mise a jour des options pour Q02
update public.questions
set options = '["Moins de 50", "50 a 250", "250 a 1000", "1000 a 5000", "Plus de 5000"]'
where template_id = '00000000-0000-0000-0000-000000000020'
  and code = 'Q02';
