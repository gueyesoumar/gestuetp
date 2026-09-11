-- Migration 00234: Astuces d'onboarding déjà vues, par utilisateur (UP)
-- Description: mémorise les coach-marks contextuels (E5) qu'un utilisateur a
-- fermés (« Compris ») pour ne plus les réafficher. Persistance cross-appareil.
-- Une ligne = une astuce vue. RLS self-only (calquée sur email_preferences).

CREATE TABLE public.user_dismissed_tips (
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tip_key      text NOT NULL CHECK (char_length(tip_key) BETWEEN 1 AND 100),
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tip_key)
);

COMMENT ON TABLE public.user_dismissed_tips IS 'Coach-marks contextuels (onboarding E5) fermés par un utilisateur. Une ligne = une astuce vue.';

ALTER TABLE public.user_dismissed_tips ENABLE ROW LEVEL SECURITY;

-- Lecture / création / suppression : uniquement ses propres lignes.
CREATE POLICY "udt_self_select"
  ON public.user_dismissed_tips FOR SELECT
  TO authenticated
  USING (user_id = public.get_my_user_id());

CREATE POLICY "udt_self_insert"
  ON public.user_dismissed_tips FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_my_user_id());

-- DELETE self : permet « Revoir les astuces » (réinitialisation).
CREATE POLICY "udt_self_delete"
  ON public.user_dismissed_tips FOR DELETE
  TO authenticated
  USING (user_id = public.get_my_user_id());
