-- Migration 00240 (UP) : assainissement RFC 0008 P0 (INC 1)
--
-- 1. Ferme un IDOR sur org_mrr(uuid) : la fonction était grantée à `authenticated`
--    SANS garde → n'importe quel utilisateur connecté pouvait lire le MRR d'une
--    AUTRE organisation en passant son uuid. On ajoute la garde own-org / superadmin
--    (même patron que org_subscription_state, 00202), + un passe-droit pour le
--    contexte service_role (auth.uid() null) afin que platform_mrr et les edges
--    puissent l'appeler.
-- 2. platform_mrr() : autorise en plus le contexte service_role (edge admin-stats),
--    en gardant le refus pour un simple `authenticated` non-owner.
-- 3. org_effective_quota() : expose la limite de quota EFFECTIVE de l'org de
--    l'appelant (org_quota_limits, repli plans.max_*) pour que les jauges UI
--    reflètent ce que les triggers 00200 appliquent réellement. Sans paramètre
--    (utilise get_my_organization_id) → aucun accès cross-org.

-- 1. org_mrr avec garde ---------------------------------------------------------
create or replace function public.org_mrr(p_org uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_total numeric;
begin
  -- Garde anti-IDOR : superadmin, OU sa propre org, OU contexte serveur (service_role).
  if not (public.is_platform_owner()
          or p_org = public.get_my_organization_id()
          or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(round(
    sum(gross * (1 - discount_pct / 100.0))
      * (1 - coalesce((select discount_pct from public.organizations where id = p_org), 0) / 100.0)
  , 0), 0)
  into v_total
  from (
    select s.discount_pct,
           s.unit_price
             + coalesce((select sum(f.unit_price)
                         from public.org_subscription_features f
                         where f.subscription_id = s.id), 0) as gross
    from public.org_subscriptions s
    where s.organization_id = p_org and s.status = 'active'
  ) lines;

  return v_total;
end; $$;
comment on function public.org_mrr(uuid) is
  'MRR net d''une org (RFC 0006 §4.2). Garde : superadmin, own-org, ou service_role. SECURITY DEFINER.';

-- 2. platform_mrr : autorise le contexte serveur ---------------------------------
create or replace function public.platform_mrr()
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_total numeric;
begin
  -- Superadmin (front) OU contexte serveur (edge admin-stats en service_role).
  if not (public.is_platform_owner() or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(sum(public.org_mrr(o.id)), 0) into v_total from public.organizations o;
  return v_total;
end; $$;
comment on function public.platform_mrr() is
  'MRR agrégé de toutes les orgs (portefeuille). Réservé superadmin ou service_role.';

-- 3. Quota effectif de l'org de l'appelant --------------------------------------
create or replace function public.org_effective_quota()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (select public.get_my_organization_id() as org_id)
  select jsonb_build_object(
    'users', coalesce(
      (select ql.limit_value from public.org_quota_limits ql, me
       where ql.organization_id = me.org_id and ql.quota_key = 'users'),
      (select p.max_users from public.organizations o join public.plans p on p.id = o.plan_id, me
       where o.id = me.org_id)
    ),
    'missions', coalesce(
      (select ql.limit_value from public.org_quota_limits ql, me
       where ql.organization_id = me.org_id and ql.quota_key = 'missions'),
      (select p.max_missions from public.organizations o join public.plans p on p.id = o.plan_id, me
       where o.id = me.org_id)
    )
  );
$$;
comment on function public.org_effective_quota() is
  'Limite de quota EFFECTIVE de l''org de l''appelant (org_quota_limits, repli plans.max_*). '
  'null = illimité. Sans paramètre → own-org uniquement (RFC 0008 P0 / INC 1).';

grant execute on function public.org_effective_quota() to authenticated;
