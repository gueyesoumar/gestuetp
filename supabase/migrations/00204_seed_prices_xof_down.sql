-- Migration 00204 (DOWN) : remise à 0 des prix seedés (RFC 0006)

update public.org_subscription_features set unit_price = 0;
update public.org_subscriptions set unit_price = 0;
update public.product_features set monthly_price = 0
  where (product_key = 'comply' and key = 'groupe')
     or (product_key = 'regul'  and key in ('mesures', 'incidents', 'probatoire'))
     or (product_key = 'policy' and key = 'ai');
update public.products set monthly_price = 0 where key in ('comply', 'regul', 'risk', 'policy');
