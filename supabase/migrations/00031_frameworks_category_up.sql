-- Migration: Ajouter category et controls_count sur frameworks (UP)

alter table public.frameworks
  add column category text not null default 'conformite';

comment on column public.frameworks.category is 'conformite, gouvernance, evaluation';

-- Mettre à jour les catégories
update public.frameworks set category = 'conformite' where slug in ('iso-27001', 'nist-csf', 'audit-si');
update public.frameworks set category = 'gouvernance' where slug in ('cobit-2019', 'itil-v4');
update public.frameworks set category = 'evaluation' where slug in ('due-diligence-tech', 'maturite-digitale');
