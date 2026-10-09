-- B3 + B4 (RFC 0013 §11, C6) : câble `client_portal` dans le catalogue + backfill des
-- orgs existantes. `client_portal` = baseline gratuite du monde « superviseur d'autrui »
-- (Cabinet / Regul). Distingue Entreprise (sans portail) de Cabinet (avec portail).
--
-- SÉCURITÉ : `organization_capabilities` est une PROJECTION destructive de `org_entitlements`
-- (trigger trg_refresh_org_caps + refresh_org_capabilities supprime toute capacité non
-- adossée à un entitlement actif). Insérer un entitlement déclenche cette projection.
-- → Garde-fou : on ABANDONNE si une capacité existe sans entitlement adossé (sinon elle
--   serait retirée). La migration est donc sûre par construction (fail-safe en --single-tx).

-- 0. Garde-fou : refuser si l'invariant entitlements↔capacités est rompu (capacité sans droit).
do $$
begin
  if exists (
    select 1 from public.verify_entitlement_invariance()
    where in_capabilities and not in_entitlements
  ) then
    raise exception 'Invariant rompu : des capacités ne sont pas adossées à un entitlement. '
      'Backfill client_portal annulé pour ne rien retirer. Corriger les écarts d''abord '
      '(select * from verify_entitlement_invariance() where in_capabilities and not in_entitlements).';
  end if;
end $$;

-- 1. B3 — catalogue : les produits à portail portent la capacité client_portal.
insert into public.product_capability (product_key, capability) values
  ('comply', 'client_portal'),
  ('regul',  'client_portal')
on conflict do nothing;

-- 2. B4 — backfill : toutes les orgs actuelles (Cabinet / Regul) reçoivent un entitlement
--    client_portal 'manual' (survit à la sync d'abonnement). Le trigger projette en capacité.
--    Les futures orgs Entreprise ne recevront pas ce grant → pas de portail.
insert into public.org_entitlements
  (organization_id, key, status, pricing_kind, source, capability, granted_at)
select o.id, 'client_portal', 'active', 'none', 'manual', 'client_portal'::public.org_capability, now()
from public.organizations o
where exists (
  select 1 from public.organization_capabilities oc
  where oc.org_id = o.id and oc.capability in ('comply', 'supervision') and oc.status = 'active'
)
on conflict (organization_id, key) do nothing;
