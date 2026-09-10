-- Rollback : retire les surcharges de polarité par écran.
alter table public.organization_branding
  drop column if exists login_surface_mode,
  drop column if exists hub_surface_mode,
  drop column if exists portal_surface_mode;
