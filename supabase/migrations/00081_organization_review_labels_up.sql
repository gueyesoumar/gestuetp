-- Migration 00081: Libellés personnalisables des étapes de revue par cabinet — UP
-- Description: Permet à chaque cabinet de renommer les 2 niveaux de revue
-- (par défaut "Chef de mission" et "Associé") avec ses propres libellés
-- (ex: "Manager" / "Partner", "Senior" / "Director", etc.).
--
-- NULL = utilise les libellés par défaut Gëstu côté frontend.
-- La logique du workflow reste à 2 niveaux (lead_review → associate_review)
-- — seuls les libellés affichés changent.

ALTER TABLE public.organizations
  ADD COLUMN review_lead_label text
    CHECK (review_lead_label IS NULL OR (length(trim(review_lead_label)) BETWEEN 1 AND 40)),
  ADD COLUMN review_associate_label text
    CHECK (review_associate_label IS NULL OR (length(trim(review_associate_label)) BETWEEN 1 AND 40));

COMMENT ON COLUMN public.organizations.review_lead_label IS 'Libellé custom du 1er niveau de revue (défaut Gëstu : "Chef de mission"). 1-40 caractères.';
COMMENT ON COLUMN public.organizations.review_associate_label IS 'Libellé custom du 2e niveau de revue (défaut Gëstu : "Associé"). 1-40 caractères.';
