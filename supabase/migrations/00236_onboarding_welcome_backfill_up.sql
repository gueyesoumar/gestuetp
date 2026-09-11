-- Migration 00236: Backfill « accueil onboarding vu » (UP)
-- Description: l'écran de bienvenue (onboarding Phase 1) s'affiche tant que
-- l'utilisateur n'a pas la ligne user_dismissed_tips('onboarding.welcome').
-- On la pose pour tous les utilisateurs EXISTANTS afin que SEULS les nouveaux
-- comptes voient l'accueil (pas de surprise pour les comptes en place).
-- Idempotent.

INSERT INTO public.user_dismissed_tips (user_id, tip_key)
SELECT id, 'onboarding.welcome' FROM public.users
ON CONFLICT (user_id, tip_key) DO NOTHING;
