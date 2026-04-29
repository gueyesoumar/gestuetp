-- Migration 00094: Canonicalisation de organizations.types — DOWN
--
-- Retire les 3 CHECK ajoutés en UP. Les données restent inchangées :
-- les valeurs canoniques ('cabinet', 'client', 'group', 'platform') sont
-- valides quel que soit l'état des contraintes, et restaurer 'groupe'/
-- 'fonds' n'a aucun sens (c'était un bug de seed).

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_platform_isolated;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_types_canonical;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_types_not_empty;
