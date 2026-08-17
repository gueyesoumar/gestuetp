-- 00196 — Vue cross-tenant du registre de RISQUE de l'organisation auditée (#1).
--
-- Même patron que get_control_policies : frontière SECURITY DEFINER unique, lecture
-- seule, need-to-know PAR MISSION d'emblée. Renvoie les scénarios de risque du
-- client_id d'une mission ACTIVE dont l'appelant est membre et dont son org est le
-- cabinet. Gardes internes : AAL2 + non-client. Le p_mission_id est vérifié contre
-- l'appartenance de l'appelant (pas de lecture d'un registre arbitraire).

create or replace function public.get_audited_org_risks(p_mission_id uuid)
returns table (
  id uuid, title text, dimension text,
  inherent_likelihood int, inherent_impact int,
  treatment text, threat_ref uuid, feared_event_ref uuid,
  vulnerability text, asset_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select rs.id, rs.title, rs.dimension::text,
    rs.inherent_likelihood, rs.inherent_impact,
    rs.treatment, rs.threat_ref, rs.feared_event_ref,
    rs.vulnerability, ra.name
  from public.risk_scenarios rs
  left join public.risk_assets ra on ra.id = rs.asset_id
  where public.is_aal2()
    and not public.is_client_role()
    and exists (
      select 1
      from public.missions m
      join public.mission_members mm on mm.mission_id = m.id
      where m.id = p_mission_id
        and m.cabinet_id = public.get_my_organization_id()
        and mm.user_id = public.get_my_user_id()
        and m.is_active = true
        and m.client_id = rs.organization_id
    );
$$;

revoke all on function public.get_audited_org_risks(uuid) from public;
grant execute on function public.get_audited_org_risks(uuid) to authenticated;
