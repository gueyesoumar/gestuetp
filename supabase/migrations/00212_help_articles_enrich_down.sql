-- Migration: enrichissement des articles d'aide (DOWN)
-- Rollback best-effort : restaure un corps court a partir de l'extrait.

update public.help_articles set body = excerpt
where slug in (
  'navigation-hub','reset-password','setup-2fa','lost-authenticator','invite-member',
  'manage-roles','create-mission','client-portal-access','audit-trail-access','activate-module'
);
