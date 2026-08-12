-- Migration: review_labels_to_vocab (UP)
-- Consolidation RFC 0002 : les libellés chef/associé quittent les colonnes
-- organizations.review_lead_label / review_associate_label pour rejoindre le
-- système unique organization_vocab (clés lead_term / associate_term), lu par
-- useVocab / useReviewLabels et éditable dans le TerminologyEditor.
--
-- Cette migration RECOPIE les valeurs déjà personnalisées vers le vocab pour ne
-- rien perdre. Les colonnes sont conservées (repli pour le cas admin-override) ;
-- leur suppression sera une migration ultérieure une fois tous les usages migrés.

insert into public.organization_vocab (org_id, key, value)
select id, 'lead_term', btrim(review_lead_label)
from public.organizations
where review_lead_label is not null and btrim(review_lead_label) <> ''
on conflict (org_id, key) do nothing;

insert into public.organization_vocab (org_id, key, value)
select id, 'associate_term', btrim(review_associate_label)
from public.organizations
where review_associate_label is not null and btrim(review_associate_label) <> ''
on conflict (org_id, key) do nothing;
