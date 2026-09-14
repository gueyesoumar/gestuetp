-- Migration 00250 (UP) : posture de conformité par organisation (Phase B — option A)
--
-- Expose au super-admin une « posture » de conformité agrégée PAR organisation,
-- calculée à la lecture (aucune table persistée, toujours fraîche). Reproduit
-- fidèlement l'épine dorsale du score client (useSelfDimensionScores.ts) :
--   posture = moyenne NON pondérée des pourcentages par AXE mesuré,
--   où pourcentage_axe = approved / total des control_assessments de l'axe.
-- Les 6 axes seulement comptent (les 2 facteurs human_factor/third_party sont
-- exclus, comme compositePosture côté client). Les couches coefficient / Risk /
-- Policy restent hors de cette v1 (raffinements ultérieurs, Phase B.2).
--
-- Lecture cross-org réservée au propriétaire plateforme : la fonction ne prend
-- aucun org_id en entrée (pas d'IDOR) et n'expose que des agrégats.

create or replace function public.admin_org_scores()
returns table(
  org_id uuid,
  posture int,
  measured_axes int,
  total_ctrl bigint,
  approved_ctrl bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_platform_owner() or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with per_dim as (
    select m.cabinet_id as org_id,
           c.dimension,
           count(*) as total,
           count(*) filter (where ca.status = 'approved') as approved
    from missions m
    join control_assessments ca on ca.mission_id = m.id
    join controls c on c.id = ca.control_id
    where m.is_active
      and c.dimension in (
        'security', 'data_protection', 'resilience',
        'integrity', 'governance', 'verifiability'
      )
    group by m.cabinet_id, c.dimension
  ),
  per_dim_score as (
    select pd.org_id,
           round(pd.approved::numeric / pd.total * 100) as dim_score,
           pd.total,
           pd.approved
    from per_dim pd
    where pd.total > 0
  )
  select pds.org_id,
         round(avg(pds.dim_score))::int as posture,
         count(*)::int as measured_axes,
         sum(pds.total)::bigint as total_ctrl,
         sum(pds.approved)::bigint as approved_ctrl
  from per_dim_score pds
  group by pds.org_id;
end $$;

comment on function public.admin_org_scores() is
  'Posture de conformité agrégée par organisation (moyenne des %/axe mesuré, 6 axes). Lecture seule, réservée is_platform_owner. Épine dorsale serveur du score client (posture uniquement, hors coefficient/Risk/Policy).';

grant execute on function public.admin_org_scores() to authenticated;
