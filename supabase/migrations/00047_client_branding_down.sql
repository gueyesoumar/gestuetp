-- Migration: client_branding (DOWN)

ALTER TABLE public.cabinet_clients
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS brand_primary_color,
  DROP COLUMN IF EXISTS brand_secondary_color,
  DROP COLUMN IF EXISTS brand_accent_color,
  DROP COLUMN IF EXISTS brand_font;
