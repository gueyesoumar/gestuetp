-- 00323 - Gëstu Risk : rattrapage du nommage des scénarios promus AVANT 00322.
-- Aligne les scénarios déjà promus d'un constat sur le nouveau mapping
-- (titre = risque associé, constat = vulnérabilité). Prudent : ne touche QUE les
-- lignes dont le titre est ENCORE le libellé auto d'origine (= le constat), donc
-- jamais celles qu'un utilisateur a renommées. Correction de données ponctuelle.
--
-- Comptage préalable conseillé (snapshot, à lancer en lecture seule avant d'appliquer) :
--   select count(*) from public.risk_scenarios rs
--   join public.assessment_findings af on af.id = rs.source_finding_id
--   where nullif(trim(af.risk), '') is not null
--     and rs.title = left(coalesce(nullif(trim(af.description), ''), 'Constat'), 200);

update public.risk_scenarios rs
set title = left(coalesce(nullif(trim(af.risk), ''), rs.title), 200),
    vulnerability = coalesce(nullif(trim(rs.vulnerability), ''), nullif(trim(af.description), '')),
    description = case when rs.description is not distinct from af.risk then null else rs.description end
from public.assessment_findings af
where rs.source_finding_id = af.id
  and nullif(trim(af.risk), '') is not null
  and rs.title = left(coalesce(nullif(trim(af.description), ''), 'Constat'), 200);
