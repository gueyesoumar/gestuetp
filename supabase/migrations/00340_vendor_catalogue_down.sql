-- 00340 (DOWN) : retire l'entree catalogue Vendor.
delete from public.product_capability where product_key = 'vendor';
delete from public.product_features where product_key = 'vendor';
delete from public.products where key = 'vendor';
