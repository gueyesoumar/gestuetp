-- Migration 00228 (UP) — traitement du logo sur fond sombre (marque blanche).
-- Permet d'intégrer le logo sans exiger une variante « fond sombre » :
--   direct = posé tel quel (logo à traits clairs / transparent)
--   whiten = blanchi en silhouette (logo monochrome foncé)
--   chip   = pastille claire de repli (logo multicolore complexe) — défaut sûr.

alter table public.organization_branding
  add column if not exists dark_logo_treatment text not null default 'chip'
    check (dark_logo_treatment in ('direct', 'whiten', 'chip'));

comment on column public.organization_branding.dark_logo_treatment is
  'Rendu du logo sur les surfaces sombres : direct | whiten | chip (défaut). Proposé automatiquement par analyse du logo, ajustable par le super-admin.';
