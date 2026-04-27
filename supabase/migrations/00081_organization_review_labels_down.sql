-- Migration 00081: Libellés personnalisables des étapes de revue par cabinet — DOWN

ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS review_lead_label,
  DROP COLUMN IF EXISTS review_associate_label;
