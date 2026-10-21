-- Partie 4 : capacités par org (PRÊT, aucun placeholder). À lancer APRÈS p3.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/testing/sql/p4-capabilities.sql

-- Autorité R : base régulateur (supervision) + Risk/Policy/Vendor
select public.apply_entitlement_template((select id from public.organizations where slug='autorite-test'),'regulateur');
insert into public.org_entitlements (organization_id,key,status,pricing_kind,source,capability,granted_at)
select o.id,m.key,'active','none','manual',m.cap,now()
from public.organizations o cross join (values ('risk','risk'),('policy','policy'),('vendor','vendor')) m(key,cap)
where o.slug='autorite-test'
on conflict (organization_id,key) do update set status='active',source='manual',capability=excluded.capability,updated_at=now();

-- Cabinet A : base Comply (pro) + Risk/Policy
select public.apply_entitlement_template((select id from public.organizations where slug='cabinet-test-a'),'pro');
insert into public.org_entitlements (organization_id,key,status,pricing_kind,source,capability,granted_at)
select o.id,m.key,'active','none','manual',m.cap,now()
from public.organizations o cross join (values ('risk','risk'),('policy','policy')) m(key,cap)
where o.slug='cabinet-test-a'
on conflict (organization_id,key) do update set status='active',source='manual',capability=excluded.capability,updated_at=now();

-- Entreprise E : Comply + Risk, SANS client_portal (édition Entreprise)
insert into public.org_entitlements (organization_id,key,status,pricing_kind,source,capability,granted_at)
select o.id,m.key,'active','none','manual',m.cap,now()
from public.organizations o cross join (values ('comply','comply'),('risk','risk')) m(key,cap)
where o.slug='entreprise-test-e'
on conflict (organization_id,key) do update set status='active',source='manual',capability=excluded.capability,updated_at=now();

-- Vérification
select o.slug, array_agg(oc.capability order by oc.capability) as capacites
from public.organizations o join public.organization_capabilities oc on oc.org_id=o.id
where o.slug in ('autorite-test','cabinet-test-a','entreprise-test-e') group by o.slug;
