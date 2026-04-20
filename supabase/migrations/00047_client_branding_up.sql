-- Migration: client_branding (UP)
-- Description: Logo et charte graphique du client pour personnalisation des rapports

ALTER TABLE public.cabinet_clients
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text,
  ADD COLUMN IF NOT EXISTS brand_secondary_color text,
  ADD COLUMN IF NOT EXISTS brand_accent_color text,
  ADD COLUMN IF NOT EXISTS brand_font text;

COMMENT ON COLUMN public.cabinet_clients.logo_url IS 'URL du logo client dans Supabase Storage';
COMMENT ON COLUMN public.cabinet_clients.brand_primary_color IS 'Couleur primaire extraite du logo (hex)';
COMMENT ON COLUMN public.cabinet_clients.brand_secondary_color IS 'Couleur secondaire extraite du logo (hex)';
COMMENT ON COLUMN public.cabinet_clients.brand_accent_color IS 'Couleur accent extraite du logo (hex)';
COMMENT ON COLUMN public.cabinet_clients.brand_font IS 'Police de caractères du client';
