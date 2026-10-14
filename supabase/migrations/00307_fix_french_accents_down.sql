-- Rollback de 00307. La correction des accents sur les données affichées n'est PAS
-- annulée (on ne veut pas réintroduire l'ASCII) : seule la fonction utilitaire est
-- supprimée. Les colonnes restent dans leur état corrigé.
drop function if exists public.fix_fr_accents(text);
