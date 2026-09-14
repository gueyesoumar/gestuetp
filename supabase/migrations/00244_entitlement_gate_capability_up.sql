-- Migration 00244 (UP) : correctif enforcement (RFC 0008 P3 / INC 4)
--
-- Bug 00243 : le gate comparait uniquement org_entitlements.key = clé_du_gate.
-- Or une feature peut avoir une clé (FR) distincte de sa capacité (EN) — ex.
-- feature 'mesures' → capability 'measures' (seed 00198). Un gate 'measures'
-- ne trouvait donc jamais le droit → faux positif de l'audit + blocage à tort.
-- Correctif : matcher sur la CAPACITÉ *ou* la clé.

create or replace function public.entitlement_allows(p_org uuid, p_key text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_enf text;
begin
  select enforcement into v_enf from public.entitlement_gate_policy where key = p_key;
  if coalesce(v_enf, 'soft') <> 'hard' then return true; end if;
  return exists (
    select 1 from public.org_entitlements e
    where e.organization_id = p_org
      and (e.key = p_key or e.capability::text = p_key)   -- clé OU capacité
      and (e.status = 'active'
           or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
  );
end $$;

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
          and (e.key = 'measures' or e.capability::text = 'measures')   -- clé OU capacité
          and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
      )
      group by o.id, o.name;
  end if;
  return;
end $$;
