-- Migration 00204 (UP) : prix catalogue en FCFA (RFC 0006, devise XOF)
--
-- Renseigne les prix (produits + features add-on) en FCFA, et re-price les
-- abonnements EXISTANTS restés à 0 (backfillés depuis les capacités, jamais
-- tarifés) pour que le MRR reflète le catalogue. N'écrase pas un prix déjà fixé
-- (garde `= 0`). Le flip C+P3 n'est pas concerné (prix ≠ accès).

-- 1. Prix socle des produits ---------------------------------------------------
update public.products set monthly_price = 75000  where key = 'comply';
update public.products set monthly_price = 200000 where key = 'regul';
update public.products set monthly_price = 60000  where key = 'risk';
update public.products set monthly_price = 60000  where key = 'policy';

-- 2. Prix des features add-on (les features core restent à 0, incluses) --------
update public.product_features set monthly_price = 50000 where product_key = 'comply' and key = 'groupe';
update public.product_features set monthly_price = 40000 where product_key = 'regul'  and key in ('mesures', 'incidents', 'probatoire');
update public.product_features set monthly_price = 25000 where product_key = 'policy' and key = 'ai';

-- 3. Re-price des abonnements/features existants (restés à 0) -------------------
update public.org_subscriptions s
  set unit_price = p.monthly_price
  from public.products p
  where p.key = s.product_key and s.unit_price = 0;

update public.org_subscription_features f
  set unit_price = pf.monthly_price
  from public.org_subscriptions s, public.product_features pf
  where f.subscription_id = s.id
    and pf.product_key = s.product_key and pf.key = f.feature_key
    and f.unit_price = 0;
