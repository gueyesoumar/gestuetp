-- 00347 (UP) - backfill de la permission cabinet can_manage_vendors.
--
-- Gestu Vendor (Lot 1) a introduit la garde can_manage_vendors dans les policies RLS
-- (00341), les RPC d'evaluation (00342) et les edge (create-vendor, invite-vendor-candidate),
-- MAIS aucune migration ne l'accordait a un platform_role. Resultat : user_has_cabinet_permission
-- resout la cle absente a false pour tout utilisateur non platform-owner -> 403 a la creation
-- d'un fournisseur.
--
-- Strategie B (cf 00082) : la permission est accordee aux roles deja "gestionnaires"
-- (ceux qui gerent les clients, les missions ou les membres). Les roles lecture seule
-- ne la recoivent pas. Les platform owners l'ont deja via l'override de la fonction.
update public.platform_roles
set permissions = permissions || jsonb_build_object(
  'can_manage_vendors',
  coalesce((permissions ->> 'can_manage_clients')::boolean, false)
  or coalesce((permissions ->> 'can_create_mission')::boolean, false)
  or coalesce((permissions ->> 'can_manage_members')::boolean, false)
)
where not (permissions ? 'can_manage_vendors');

do $$
declare v_total int; v_granted int;
begin
  select count(*) into v_total from public.platform_roles;
  select count(*) into v_granted from public.platform_roles where (permissions ->> 'can_manage_vendors')::boolean;
  raise notice '[00347] platform_roles: % total, % avec can_manage_vendors=true', v_total, v_granted;
end $$;
