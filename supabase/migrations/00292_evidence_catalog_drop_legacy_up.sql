-- 00292 — Supprime les preuves attendues LEGACY (sans evidence_item_id) pour les
-- référentiels désormais couverts par le modèle mutualisé. Ces lignes provenaient des
-- anciens seeds (ex. 018 PSSI-ES) et font doublon, par nom, avec les preuves canoniques
-- insérées par 00276/00279/00282/00285/00288. Le contenu canonique couvrant tous les
-- contrôles de ces référentiels, la suppression des lignes legacy est sûre.
delete from public.evidence_catalog ec
using public.controls c, public.domains d
where ec.control_id = c.id and c.domain_id = d.id
  and ec.evidence_item_id is null
  and d.framework_id in (
    '00000000-0000-0000-0000-000000000017', -- PSSI-ES
    '00000000-0000-0000-0000-000000000010', -- ISO 27001
    '00000000-0000-0000-0000-000000000011', -- NIST CSF
    '00000000-0000-0000-0000-000000000014', -- Audit SI
    '00000000-0000-0000-0000-000000000015'  -- Due Diligence
  );
