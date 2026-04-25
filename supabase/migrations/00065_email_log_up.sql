-- Migration 00065: Log des emails envoyés (UP)
-- Description: Trace les envois d'emails automatiques pour audit et anti-doublon.
-- Le UNIQUE (user_id, type, related_id) garantit qu'un même utilisateur ne reçoit
-- pas deux fois le même email pour le même objet.

CREATE TABLE public.email_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       text NOT NULL,            -- ex: 'reminder_j3', 'reminder_j7', 'reminder_j14', 'digest_weekly'
  related_id uuid,                     -- ex: evidence_request_id (nullable pour le digest hebdo)
  sent_at    timestamptz NOT NULL DEFAULT now(),
  resend_id  text,                     -- id retourné par Resend pour traçabilité
  UNIQUE (user_id, type, related_id)
);

COMMENT ON TABLE public.email_log IS 'Trace des emails automatiques envoyés. Anti-doublon par UNIQUE(user, type, related_id).';

CREATE INDEX idx_email_log_user ON public.email_log(user_id);
CREATE INDEX idx_email_log_type_related ON public.email_log(type, related_id);
CREATE INDEX idx_email_log_sent_at ON public.email_log(sent_at DESC);

-- RLS — lecture interdite côté client. Les Edge Functions opèrent via service_role
-- et bypassent les policies. Aucune policy ne permet aux utilisateurs authentifiés
-- de lire ou écrire dans cette table.
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
