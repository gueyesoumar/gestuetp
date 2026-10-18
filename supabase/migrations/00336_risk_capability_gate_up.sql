-- Migration 00336 (UP) : enforcement de capacite, garde unifiee + cablage RISK
-- RFC 0018 Phase 5-a. DEPLOYE EN SOFT : aucun changement de comportement tant
-- qu'aucune cle n'est passee en 'hard' dans entitlement_gate_policy.
--
-- Mecanisme : un trigger BEFORE INSERT/UPDATE sur les tables risk appelle la
-- garde unifiee. Il couvre d'un seul endroit les deux chemins d'ecriture (RLS
-- directe ET RPC SECURITY DEFINER, qui contournent la RLS mais PAS les triggers).
-- Les suppressions restent autorisees (nettoyage apres lapse d'abonnement).

-- 1. Decision unifiee : org + cle -> booleen -----------------------------------
--    Reutilise la logique de entitlement_allows (politique soft/hard + droit
--    actif, match cle OU capacite) et y ajoute la SUSPENSION d'organisation,
--    elle-meme gouvernee par la politique (cle reservee 'suspended').
--    Fail-open sur erreur inattendue : l'entitlement est un droit d'usage, pas
--    une barriere de securite (la RLS reste la barriere de confidentialite).
create or replace function public._capability_write_allowed(p_org uuid, p_key text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_enf text; v_susp text; v_active boolean;
begin
  if p_org is null then return true; end if;

  -- Suspension globale : si la politique 'suspended' est hard, une org inactive
  -- ne peut plus ecrire sur AUCUNE surface gardee.
  select enforcement into v_susp from public.entitlement_gate_policy where key = 'suspended';
  if coalesce(v_susp, 'soft') = 'hard' then
    select is_active into v_active from public.organizations where id = p_org;
    if v_active is false then return false; end if;
  end if;

  -- Politique par cle.
  select enforcement into v_enf from public.entitlement_gate_policy where key = p_key;
  if coalesce(v_enf, 'soft') <> 'hard' then return true; end if;

  return exists (
    select 1 from public.org_entitlements e
    where e.organization_id = p_org
      and (e.key = p_key or e.capability::text = p_key)
      and (e.status = 'active'
           or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
  );
exception when others then
  return true; -- fail-open (non-securite)
end $$;
comment on function public._capability_write_allowed(uuid, text) is
  'RFC 0018 P5 : decision d''ecriture pour une org/cle (politique soft/hard + suspension + droit actif). Interne (triggers + gardes RPC).';
revoke execute on function public._capability_write_allowed(uuid, text) from public;
revoke execute on function public._capability_write_allowed(uuid, text) from authenticated;

-- 2. Fonction trigger generique : refuse l'ecriture si la cle (TG_ARGV[0]) est
--    gardee et que l'org de la LIGNE n'a pas le droit. Refus metier = P0001.
create or replace function public.enforce_capability_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_key text := tg_argv[0];
begin
  if not public._capability_write_allowed(new.organization_id, v_key) then
    raise exception 'Fonctionnalité non incluse dans votre offre (%).', v_key using errcode = 'P0001';
  end if;
  return new;
exception
  when sqlstate 'P0001' then raise;       -- propage le refus metier
  when others then return new;            -- fail-open interne (non-securite)
end $$;
comment on function public.enforce_capability_write() is
  'RFC 0018 P5 : trigger d''enforcement de capacite. TG_ARGV[0] = cle a verifier contre la politique.';

-- 3. Cablage RISK (cle 'risk') sur les tables d'ecriture a valeur ---------------
drop trigger if exists trg_cap_risk_scenarios on public.risk_scenarios;
create trigger trg_cap_risk_scenarios before insert or update on public.risk_scenarios
  for each row execute function public.enforce_capability_write('risk');

drop trigger if exists trg_cap_risk_assets on public.risk_assets;
create trigger trg_cap_risk_assets before insert or update on public.risk_assets
  for each row execute function public.enforce_capability_write('risk');

drop trigger if exists trg_cap_business_values on public.business_values;
create trigger trg_cap_business_values before insert or update on public.business_values
  for each row execute function public.enforce_capability_write('risk');

drop trigger if exists trg_cap_risk_control_links on public.risk_control_links;
create trigger trg_cap_risk_control_links before insert or update on public.risk_control_links
  for each row execute function public.enforce_capability_write('risk');

drop trigger if exists trg_cap_risk_treatment_actions on public.risk_treatment_actions;
create trigger trg_cap_risk_treatment_actions before insert or update on public.risk_treatment_actions
  for each row execute function public.enforce_capability_write('risk');

drop trigger if exists trg_cap_risk_acceptances on public.risk_acceptances;
create trigger trg_cap_risk_acceptances before insert or update on public.risk_acceptances
  for each row execute function public.enforce_capability_write('risk');

-- 4. Politique : ajouter les cles manquantes (toutes en SOFT = inerte) ----------
insert into public.entitlement_gate_policy (key, enforcement) values
  ('policy', 'soft'),
  ('supervision', 'soft'),
  ('suspended', 'soft')
on conflict (key) do nothing;

-- 5. Pre-vol : brancher 'risk' (garder 'measures' existant). 0 ligne = sur. -----
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
  elsif p_key = 'risk' then
    return query
      select o.id, o.name, count(*)::bigint
      from public.risk_scenarios rs
      join public.organizations o on o.id = rs.organization_id
      where not exists (
        select 1 from public.org_entitlements e
        where e.organization_id = o.id
          and (e.key = 'risk' or e.capability::text = 'risk')
          and (e.status = 'active' or (e.status = 'trial' and (e.trial_ends_at is null or e.trial_ends_at > now())))
      )
      group by o.id, o.name;
  end if;
  return;
end $$;
comment on function public.gate_coverage_audit(text) is
  'RFC 0018 P5 pre-vol : orgs utilisant deja une fonctionnalite sans en avoir le droit (seraient bloquees si la cle passe en hard). 0 ligne = activation sure. Branches : measures, risk.';
