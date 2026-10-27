-- Synthèse exécutive : le panneau « Si ce risque se matérialise » doit montrer les
-- données RÉELLES du scénario (pas des gabarits). RPC cross-org, scope superviseur
-- (get_my_supervised_org_ids), renvoyant pour UN scénario : cotation inhérente,
-- traitement, prochaine revue, événement redouté (libellé catalogue), actif, et les
-- mesures réellement rattachées (contrôles via risk_control_links). Zéro donnée hors
-- périmètre : la clause scope borne au parc supervisé.
create or replace function public.get_supervised_scenario_detail(p_scenario uuid)
returns table (
  id uuid, title text, org_name text, org_is_iic boolean,
  inherent_likelihood int, inherent_impact int,
  treatment text, lifecycle_status text, next_review_at date,
  feared_label text, asset_name text, measures text[])
language sql stable security definer set search_path = '' as $$
  select rs.id, rs.title, o.name,
    (coalesce(erp.criticality, 'standard') = 'eleve'),
    rs.inherent_likelihood, rs.inherent_impact,
    rs.treatment, rs.lifecycle_status::text, rs.next_review_at,
    fe.label, ra.name,
    coalesce((
      select array_agg(c.name order by c.name)
      from public.risk_control_links rcl
      join public.controls c on c.id = rcl.control_id
      where rcl.risk_scenario_id = rs.id
    ), '{}')
  from public.risk_scenarios rs
  join public.organizations o on o.id = rs.organization_id
  left join public.entity_regulatory_profile erp on erp.organization_id = o.id
  left join public.risk_catalog fe on fe.id = rs.feared_event_ref
  left join public.risk_assets ra on ra.id = rs.asset_id
  where rs.id = p_scenario
    and rs.organization_id in (select public.get_my_supervised_org_ids());
$$;
revoke all on function public.get_supervised_scenario_detail(uuid) from public, anon;
grant execute on function public.get_supervised_scenario_detail(uuid) to authenticated;
