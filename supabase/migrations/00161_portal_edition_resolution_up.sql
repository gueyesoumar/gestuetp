-- Migration 00161 (UP) : resolution edition/capacites cote PORTAIL (RFC 0001, Phase 2 inc4b)
--
-- Un client (assujetti/portail) a get_my_organization_id() NEUTRALISE (00134) -> il
-- ne peut pas resoudre son edition. Il HERITE du contexte de l'org qui le
-- supervise/audite. On resout donc via le superviseur, cote SQL, SANS changer le
-- frontend (EditionContext appelle deja get_my_edition/my_capabilities).
-- Additif, reversible. Staff : inchange (get_my_organization_id non-null).

-- Org actrice d'une arete active regulatory_supervision (preferee) ou
-- audit_engagement dont la CIBLE est une de mes entity orgs (portail). SECURITY
-- DEFINER scopee aux entity orgs du caller : il ne voit que SON superviseur.
create or replace function public.get_my_supervisor_org()
returns uuid language sql stable security definer set search_path = public as $$
  select r.actor_org_id
  from public.organization_relationships r
  where r.status = 'active'
    and r.nature in ('regulatory_supervision', 'audit_engagement')
    and r.target_org_id in (select public.get_my_entity_org_ids())
  order by (r.nature = 'regulatory_supervision') desc
  limit 1
$$;
comment on function public.get_my_supervisor_org() is
  'Portail (RFC 0001) : org qui supervise/audite l''assujetti courant via arete entrante. Resout l''edition/capacites cote client.';

-- Edition : own org (staff) sinon superviseur (client).
create or replace function public.get_my_edition()
returns text language sql stable security definer set search_path = public as $$
  select o.edition from public.organizations o
  where o.id = coalesce(public.get_my_organization_id(), public.get_my_supervisor_org())
$$;

-- Capacites : own org (staff) sinon superviseur (client).
create or replace function public.my_capabilities()
returns setof public.org_capability language sql stable security definer set search_path = public as $$
  select capability from public.organization_capabilities
  where org_id = coalesce(public.get_my_organization_id(), public.get_my_supervisor_org())
    and status = 'active'
$$;
