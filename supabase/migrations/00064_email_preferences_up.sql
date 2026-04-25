-- Migration 00064: Préférences email par utilisateur (UP)
-- Description: Stocke l'opt-in/opt-out de chaque utilisateur pour les emails
-- automatiques (relances, digest). Un token de désabonnement opaque permet
-- d'agir depuis un email sans authentification.

CREATE TABLE public.email_preferences (
  user_id           uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  reminders_enabled boolean NOT NULL DEFAULT true,
  digest_enabled    boolean NOT NULL DEFAULT false,
  unsubscribe_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64'),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_preferences IS 'Préférences email par utilisateur (relances, digest). Le token permet le désabonnement sans auth.';
COMMENT ON COLUMN public.email_preferences.unsubscribe_token IS 'Token opaque base64 (24 bytes) — non devinable, identifie une préférence pour désabonnement public';

CREATE INDEX idx_email_preferences_token ON public.email_preferences(unsubscribe_token);

-- RLS — lecture self uniquement, mise à jour self uniquement
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ep_self_select"
  ON public.email_preferences FOR SELECT
  TO authenticated
  USING (user_id = public.get_my_user_id());

CREATE POLICY "ep_self_update"
  ON public.email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = public.get_my_user_id())
  WITH CHECK (user_id = public.get_my_user_id());

-- Pas de policy INSERT publique : la création passe par le trigger ci-dessous
-- ou par le service_role.

-- Trigger: créer automatiquement une ligne email_preferences à la création d'un utilisateur
CREATE OR REPLACE FUNCTION public.create_email_preferences_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_preferences(user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_email_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_email_preferences_for_user();

-- Backfill pour les utilisateurs existants
INSERT INTO public.email_preferences(user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;
