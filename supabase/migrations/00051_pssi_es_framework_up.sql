-- Migration: PSSI-ES Framework (UP)
-- Description: Référentiel de contrôle PSSI-ES — 11 domaines, 155 contrôles auditables
-- Source : Instruction présidentielle N° 003/PR du 03 janvier 2017

-- Insérer le framework uniquement s'il n'existe pas déjà
INSERT INTO public.frameworks (id, name, slug, description, version, publisher, category)
VALUES (
  '00000000-0000-0000-0000-000000000017',
  'PSSI-ES — Sénégal',
  'pssi-es',
  'Politique de Sécurité des Systèmes d''Information de l''État du Sénégal. Instruction présidentielle N° 003/PR du 03 janvier 2017. Définit les principes, règles et mesures de sécurité applicables à tous les SI des entités étatiques. Structurée en 11 chapitres, 30 objectifs et 155 règles.',
  '2017',
  'Commission Nationale de Cryptologie / Présidence de la République du Sénégal',
  'conformite'
)
ON CONFLICT (slug) DO NOTHING;

-- Les domaines et contrôles sont insérés via le seed file 016_pssi_es_framework.sql
-- Pour la production, exécuter le seed après cette migration
