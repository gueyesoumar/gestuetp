-- Migration 00206 (DOWN) : retour au provisioning par édition (00164), retrait projection
--
-- Restaure sync_org_capabilities / sync_org_parent_edge (versions édition, 00164),
-- retire les triggers de projection et les fonctions. Les données de
-- organization_capabilities restent en l'état (non re-dérivées).

drop trigger if exists trg_org_sub_feat_refresh on public.org_subscription_features;
drop trigger if exists trg_org_sub_refresh on public.org_subscriptions;

-- Provisioning des capacités depuis l'édition (00164 d'origine)
create or replace function public.sync_org_capabilities()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organization_capabilities (org_id, capability, status)
  select new.id, cap, 'active'::public.capability_status
  from public.editions e
  cross join lateral unnest(e.capabilities) as cap
  where e.key = new.edition
  on conflict (org_id, capability) do nothing;
  return new;
end;
$$;

-- Arête parent depuis l'édition du parent (00164 d'origine)
create or replace function public.sync_org_parent_edge()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nature public.relationship_nature;
begin
  if new.parent_org_id is not null then
    select case when o.edition = 'regul' then 'regulatory_supervision'::public.relationship_nature
                else 'group_ownership'::public.relationship_nature end
      into v_nature
    from public.organizations o where o.id = new.parent_org_id;
    insert into public.organization_relationships (actor_org_id, target_org_id, nature, status)
    values (new.parent_org_id, new.id, coalesce(v_nature, 'group_ownership'::public.relationship_nature), 'active')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop function if exists public.trg_refresh_org_caps_feat();
drop function if exists public.trg_refresh_org_caps();
drop function if exists public.refresh_org_capabilities(uuid);
