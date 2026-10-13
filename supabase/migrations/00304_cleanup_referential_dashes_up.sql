-- Nettoyage des cadratins (—) et ellipses (…) dans les DONNÉES de référentiel DÉJÀ
-- seedées en base. Les fichiers de seed sont déjà corrigés ; ceci aligne l'existant
-- pour que les utilisateurs ne voient plus ces signes (contenu des référentiels et
-- options de questionnaire). Caractères UTF-8 littéraux (cf. convention SQL).
-- Idempotent (WHERE LIKE ne touche que les lignes concernées, null exclus).

update public.frameworks set name = replace(replace(name,'—','-'),'…','...') where name like '%—%' or name like '%…%';
update public.frameworks set description = replace(replace(description,'—','-'),'…','...') where description like '%—%' or description like '%…%';

update public.domains set name = replace(replace(name,'—','-'),'…','...') where name like '%—%' or name like '%…%';
update public.domains set description = replace(replace(description,'—','-'),'…','...') where description like '%—%' or description like '%…%';

update public.controls set name = replace(replace(name,'—','-'),'…','...') where name like '%—%' or name like '%…%';
update public.controls set description = replace(replace(description,'—','-'),'…','...') where description like '%—%' or description like '%…%';
update public.controls set guidance = replace(replace(guidance,'—','-'),'…','...') where guidance like '%—%' or guidance like '%…%';

update public.questions set text = replace(replace(text,'—','-'),'…','...') where text like '%—%' or text like '%…%';
update public.questions set description = replace(replace(description,'—','-'),'…','...') where description like '%—%' or description like '%…%';
update public.questions set options = replace(replace(options::text,'—','-'),'…','...')::jsonb
  where options is not null and (options::text like '%—%' or options::text like '%…%');

update public.evidence_catalog set name = replace(replace(name,'—','-'),'…','...') where name like '%—%' or name like '%…%';
update public.evidence_catalog set description = replace(replace(description,'—','-'),'…','...') where description like '%—%' or description like '%…%';
