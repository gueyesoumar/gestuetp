-- Migration 00078: Seed du feature flag white_label_branding — DOWN

DELETE FROM public.feature_flags WHERE slug = 'white_label_branding';
