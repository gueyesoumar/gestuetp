-- Migration 00236 (DOWN)
-- Retire les marqueurs de bienvenue posés par le backfill (et par les dismissals
-- utilisateurs ultérieurs : la clé n'existe que pour ce besoin).

DELETE FROM public.user_dismissed_tips WHERE tip_key = 'onboarding.welcome';
