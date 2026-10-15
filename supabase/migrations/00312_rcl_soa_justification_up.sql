-- 00312 - Gëstu Risk / RFC 0017 Lot 2 : justification d'applicabilité SoA.
-- Pourquoi ce contrôle Comply traite ce risque (base de la Déclaration d'Applicabilité).
alter table public.risk_control_links
  add column applicability_justification text;

comment on column public.risk_control_links.applicability_justification is
  'Justification d''applicabilité (SoA ISO 27001) : pourquoi ce contrôle traite ce risque.';
