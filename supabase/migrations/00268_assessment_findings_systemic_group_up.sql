-- 00268 — Constat systémique transverse (Lot 2, architecture « groupe de miroirs »).
--
-- Un constat systémique = un même constat répliqué sur plusieurs contrôles liés (crosswalk).
-- Chaque réplique reste un finding normal rattaché à SON assessment (donc à SON contrôle) :
-- la conformité déduite, generate-action-plan, la clôture et les RLS restent inchangés.
-- Le lien entre répliques est porté par un group_id partagé. La réplique « origine » porte
-- is_systemic_origin = true : c'est la seule qui engendre UNE action corrective pour le groupe
-- (generate-action-plan déduplique par groupe) → « corriger une fois clôt le constat partout ».

alter table public.assessment_findings
  add column if not exists systemic_group_id uuid,
  add column if not exists is_systemic_origin boolean not null default false;

comment on column public.assessment_findings.systemic_group_id is
  'Identifiant de groupe partagé par les répliques d''un constat systémique (NULL = constat local). Réf. Lot 2.';
comment on column public.assessment_findings.is_systemic_origin is
  'true sur la réplique d''origine du groupe systémique (porte l''action corrective partagée).';

create index if not exists idx_findings_systemic_group
  on public.assessment_findings(systemic_group_id)
  where systemic_group_id is not null;
