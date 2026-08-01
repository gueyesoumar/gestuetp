-- Migration 00094: Canonicalisation de organizations.types — UP
--
-- Contexte : la colonne organizations.types était libre (text[]) et avait
-- accumulé des valeurs incohérentes ('groupe' en français vs 'group' en
-- anglais lu par les helpers, 'fonds' option morte jamais consommée).
--
-- Cette migration :
--   1. Normalise les rows existantes ('groupe' → 'group', retrait 'fonds')
--      → idempotente, no-op en prod (3 rows déjà canoniques)
--   2. Ajoute 3 contraintes CHECK pour bloquer toute future regression :
--      - au moins 1 type
--      - valeurs limitées à cabinet|client|group|platform
--      - 'platform' incompatible avec tout autre type (super-admin isolé)
--
-- Le trigger qui empêche un user authenticated de modifier types est ajouté
-- séparément en migration 00095 (verrou sécurité).

-- ============================================================
-- 1. Normalisation idempotente
-- ============================================================

UPDATE public.organizations
SET types = array_replace(types, 'groupe', 'group')
WHERE 'groupe' = ANY(types);

UPDATE public.organizations
SET types = array_remove(types, 'fonds')
WHERE 'fonds' = ANY(types);

-- Sécurité : si une org se retrouve avec un tableau vide après retrait
-- de 'fonds' (cas théorique, 0 row aujourd'hui), on la marque 'cabinet'
-- par défaut plutôt que de laisser CHECK la rejeter.
UPDATE public.organizations
SET types = ARRAY['cabinet']
WHERE array_length(types, 1) IS NULL OR array_length(types, 1) = 0;

-- ============================================================
-- 2. Contraintes CHECK
-- ============================================================

-- Au moins un type
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_types_not_empty
  CHECK (array_length(types, 1) >= 1);

-- Valeurs canoniques uniquement
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_types_canonical
  CHECK (types <@ ARRAY['cabinet','client','group','platform']::text[]);

-- 'platform' isolé : un super-admin ne peut être autre chose que platform
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_platform_isolated
  CHECK (NOT 'platform' = ANY(types) OR array_length(types, 1) = 1);

COMMENT ON CONSTRAINT organizations_types_canonical ON public.organizations
  IS 'Limite types[] aux 4 valeurs canoniques. Aligné sur ORG_TYPE_OPTIONS côté front (sans platform, réservé super-admin Gëstu).';
