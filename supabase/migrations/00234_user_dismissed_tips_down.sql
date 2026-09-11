-- Migration 00234 (DOWN)
-- Supprime la table des astuces vues (les policies tombent avec la table).

DROP TABLE IF EXISTS public.user_dismissed_tips;
