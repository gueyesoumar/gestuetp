-- Rollback B3+B4 : retire client_portal des droits, des capacités et du catalogue.
-- Suppressions directes (pas de refresh global, pour ne pas risquer les autres capacités).
delete from public.org_entitlements where key = 'client_portal';
delete from public.organization_capabilities where capability = 'client_portal';
delete from public.product_capability where capability = 'client_portal';
