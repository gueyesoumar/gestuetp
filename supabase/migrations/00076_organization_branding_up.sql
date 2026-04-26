-- Migration 00076: Branding cabinet (marque blanche) — UP
-- Description: Stocke le branding visuel d'un cabinet (logos, couleurs, emails)
-- pour la marque blanche multi-tenant. 1 row par cabinet (PK = organization_id).
-- Configuré par le super-admin via /admin/cabinets/:id onglet "Marque blanche".
-- Stratégie dual-logo (Option D) : logo_light requis, logo_dark optionnel,
-- fallback automatique en pastille blanche si logo_dark absent.

CREATE TABLE public.organization_branding (
  organization_id   uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_light_url    text,
  logo_dark_url     text,
  primary_color     text CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color      text CHECK (accent_color  IS NULL OR accent_color  ~ '^#[0-9A-Fa-f]{6}$'),
  support_email     text CHECK (support_email IS NULL OR (support_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND length(support_email) <= 254)),
  email_from_name   text CHECK (email_from_name IS NULL OR (length(email_from_name) BETWEEN 1 AND 80)),
  footer_text       text CHECK (footer_text IS NULL OR length(footer_text) <= 280),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.organization_branding IS 'Branding cabinet pour la marque blanche : logos (light/dark), couleurs, emails. 1 row par cabinet, configuré par super-admin uniquement (Edge Function admin-cabinet-branding). La présence d''un row n''active pas la marque blanche — le flag white_label_branding fait foi.';
COMMENT ON COLUMN public.organization_branding.logo_light_url IS 'Logo principal sur fond clair (emails, fiches mission). Requis avant activation effective.';
COMMENT ON COLUMN public.organization_branding.logo_dark_url IS 'Variante fond sombre (login, hub, sidebar). Optionnelle — fallback en pastille blanche automatique si absente.';

CREATE INDEX idx_org_branding_updated_at ON public.organization_branding(updated_at DESC);

CREATE TRIGGER trg_org_branding_updated_at
  BEFORE UPDATE ON public.organization_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;

-- Lecture authentifiée : son propre cabinet OU platform owner.
-- La résolution publique (login pré-auth via hostname) passe par l'Edge Function
-- resolve-tenant-by-hostname en service-role, sans toucher à RLS.
CREATE POLICY "ob_read_own_or_admin"
  ON public.organization_branding FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
    OR public.is_platform_owner()
  );

-- Aucune policy INSERT/UPDATE/DELETE : toutes les écritures passent par
-- l'Edge Function admin-cabinet-branding (service-role + audit log).
