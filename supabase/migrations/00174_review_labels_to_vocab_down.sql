-- Migration: review_labels_to_vocab (DOWN)
-- Retire les clés de vocab recopiées depuis les colonnes. Les colonnes
-- review_lead_label/review_associate_label n'ayant jamais été supprimées,
-- le repli reste fonctionnel après ce rollback.

delete from public.organization_vocab where key in ('lead_term', 'associate_term');
