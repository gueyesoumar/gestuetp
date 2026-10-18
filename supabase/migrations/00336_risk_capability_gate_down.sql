-- Migration 00336 (DOWN) : retire le cablage RISK + la garde unifiee.

drop trigger if exists trg_cap_risk_scenarios on public.risk_scenarios;
drop trigger if exists trg_cap_risk_assets on public.risk_assets;
drop trigger if exists trg_cap_business_values on public.business_values;
drop trigger if exists trg_cap_risk_control_links on public.risk_control_links;
drop trigger if exists trg_cap_risk_treatment_actions on public.risk_treatment_actions;
drop trigger if exists trg_cap_risk_acceptances on public.risk_acceptances;

drop function if exists public.enforce_capability_write();
drop function if exists public._capability_write_allowed(uuid, text);

-- Restaure gate_coverage_audit a la version 00244 (branche measures seule).
create or replace function public.gate_coverage_audit(p_key text)
returns table(organization_id uuid, org_name text, usage_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_key = 'measures' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.regulatory_measures m
      join public.users u on u.id = m.issued_by
      join public.organizations o on o.id = u.organization_id
      where not exists (
        select 1 from public.org_entitlements e
        where e.organization_id = o.id
          and (e.key = 'measures' or e.capability::text = 'measures')
          and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
      )
      group by o.id, o.name;
  end if;
  return;
end $$;

-- Retire les cles de politique ajoutees (uniquement si restees soft).
delete from public.entitlement_gate_policy where key in ('policy', 'supervision', 'suspended') and enforcement = 'soft';
