-- Migration 00078: Seed du feature flag white_label_branding — UP
-- Description: Active la marque blanche cabinet (logos, couleurs, signature email,
-- domaine custom). OFF par défaut au global. Activation per-cabinet via
-- feature_flag_overrides depuis l'admin (/admin/cabinets/:id onglet Feature flags).
--
-- La configuration (organization_branding + cabinet_domains) persiste en base
-- même quand le flag est OFF — couper le flag = désactivation immédiate sans
-- perdre la config, réactivation instantanée si le cabinet repaye.

INSERT INTO public.feature_flags (slug, name, description, is_globally_enabled)
VALUES (
  'white_label_branding',
  'Marque blanche',
  'Active la marque blanche cabinet : logos personnalisés (light/dark), couleurs, signature email, domaine custom (CNAME). OFF par défaut, à activer via override pour les cabinets payant le tier Premium.',
  false
)
ON CONFLICT (slug) DO NOTHING;
