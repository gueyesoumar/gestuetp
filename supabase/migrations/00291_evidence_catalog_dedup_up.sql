-- 00291 — Nettoyage : supprime les doublons de evidence_catalog.
-- La génération de contenu (00276/00279/00282/00285/00288) a pu créer, pour un même
-- contrôle, plusieurs lignes pointant la même preuve canonique (même evidence_item_id)
-- lorsque le rédacteur listait deux fois un document transverse sous des intitulés proches.
-- On conserve, par (control_id, evidence_item_id), la ligne au plus petit sort_order (puis id).
delete from public.evidence_catalog ec
where ec.evidence_item_id is not null
  and exists (
    select 1 from public.evidence_catalog e2
    where e2.control_id = ec.control_id
      and e2.evidence_item_id = ec.evidence_item_id
      and (e2.sort_order < ec.sort_order
           or (e2.sort_order = ec.sort_order and e2.id < ec.id))
  );
