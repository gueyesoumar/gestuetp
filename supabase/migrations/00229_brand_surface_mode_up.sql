-- Migration 00229 (UP) — polarité de la surface de marque (marque blanche).
-- Permet que le logo soit posé tel quel (transparent, couleurs d'origine, sans
-- pastille) : la plateforme adapte ses surfaces brandées en CLAIR ou en SOMBRE
-- selon le logo. light = fond clair + texte foncé (logos à traits foncés) ;
-- dark = fond sombre + texte clair (logos à traits clairs) — comportement actuel.

alter table public.organization_branding
  add column if not exists brand_surface_mode text not null default 'dark'
    check (brand_surface_mode in ('light', 'dark'));

comment on column public.organization_branding.brand_surface_mode is
  'Polarité des surfaces brandées : light | dark (défaut). Déduite de la luminance du logo, ajustable. Le logo est alors posé tel quel, sans pastille.';
