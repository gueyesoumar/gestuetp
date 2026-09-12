-- Migration 00238: Jetons d'invitation / réinitialisation maison (UP)
-- Description: remplace la dépendance au jeton « recovery » Supabase (usage
-- unique, expiration courte, consommé par les scanners de messagerie via le GET
-- /auth/v1/verify) par un jeton APPLICATIF, consommé uniquement à la soumission
-- délibérée du formulaire (immunisé aux scanners), avec expiration maîtrisée.
--
-- Sécurité :
--  - on ne stocke QUE le sha256 du jeton (le brut vit seulement dans le lien email) ;
--  - usage unique via consommation atomique (used_at) côté edge ;
--  - RLS activée SANS policy → accès service_role uniquement (jamais le client).

CREATE TABLE public.password_setup_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  purpose     text NOT NULL CHECK (purpose IN ('invite', 'reset')),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.password_setup_tokens IS 'Jetons d''invitation/reset maison (sha256 stocké). Consommés atomiquement par l''edge set-password-with-token. RLS service_role only.';

CREATE INDEX idx_pst_user ON public.password_setup_tokens(user_id);
CREATE INDEX idx_pst_expires ON public.password_setup_tokens(expires_at);

ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;
-- Aucune policy : la table n'est accessible qu'au service_role (edges).
