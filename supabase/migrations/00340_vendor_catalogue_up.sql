-- 00340 - Gëstu Vendor (RFC 0020 Lot 1) : entree catalogue (produit + fonctionnalites
-- + pont capacite). La capacite 'vendor' se projette via la chaine entitlements
-- (products -> product_capability -> org_entitlements -> organization_capabilities) ;
-- JAMAIS de seed direct dans organization_capabilities (RFC 0013 §9h, projection destructive).
-- Facturation decouplee (RFC 0019) : prix nul ici, lu par le futur module facturation.

insert into public.products
  (key, name, title, description, accent_color, badge, is_home_eligible, is_published, active_default, sort_order) values
  ('vendor', 'Vendor', 'Tiers & Fournisseurs',
     'Registre des tiers, évaluation sécurité et qualification des prestataires (dont prestataires SI de l''État).',
     '#475569', 'Bientôt', false, true, false, 8)
on conflict (key) do update set
  name = excluded.name, title = excluded.title, description = excluded.description,
  accent_color = excluded.accent_color, badge = excluded.badge,
  is_home_eligible = excluded.is_home_eligible, is_published = excluded.is_published,
  active_default = excluded.active_default, sort_order = excluded.sort_order;

insert into public.product_features
  (product_key, key, label, is_core, monthly_price_eur, capability, sort_order) values
  ('vendor', 'registre',      'Registre des tiers',        true,  0, 'vendor', 1),
  ('vendor', 'evaluation',    'Évaluation sécurité',       false, 0, 'vendor', 2),
  ('vendor', 'qualification', 'Qualification & registre',  false, 0, null,     3),
  ('vendor', 'portail',       'Portail candidat',          false, 0, null,     4)
on conflict (product_key, key) do update set
  label = excluded.label, is_core = excluded.is_core,
  monthly_price_eur = excluded.monthly_price_eur, capability = excluded.capability,
  sort_order = excluded.sort_order;

insert into public.product_capability (product_key, capability) values
  ('vendor', 'vendor')
on conflict do nothing;
