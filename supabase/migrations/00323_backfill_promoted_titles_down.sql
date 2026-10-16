-- Rollback 00323 (best-effort) : re-bascule vers l'ancien mapping les scénarios
-- promus d'un constat encore au format neuf (titre = risque associé, description vide).
-- Ne peut pas reconstituer parfaitement les lignes éditées entre-temps.
update public.risk_scenarios rs
set title = left(coalesce(nullif(trim(af.description), ''), 'Constat'), 200),
    description = af.risk,
    vulnerability = case when rs.vulnerability is not distinct from af.description then null else rs.vulnerability end
from public.assessment_findings af
where rs.source_finding_id = af.id
  and nullif(trim(af.risk), '') is not null
  and rs.description is null
  and rs.title = left(coalesce(nullif(trim(af.risk), ''), rs.title), 200);
