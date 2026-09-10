-- Polarité de surface surchargeable PAR ÉCRAN (login / hub / portail).
-- Chaque colonne est nullable : null = hérite de la polarité globale
-- (brand_surface_mode). Les couleurs primaire/accent restent globales.

alter table public.organization_branding
  add column if not exists login_surface_mode text check (login_surface_mode in ('light', 'dark')),
  add column if not exists hub_surface_mode text check (hub_surface_mode in ('light', 'dark')),
  add column if not exists portal_surface_mode text check (portal_surface_mode in ('light', 'dark'));
