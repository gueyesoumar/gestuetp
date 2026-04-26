-- Migration 00077: Domaines custom des cabinets (marque blanche niveau 3) — UP
-- Description: Stocke les hostnames custom (ex. audit.auditco.sn) qui doivent
-- résoudre vers un cabinet précis. Le middleware Vercel lit cette table en
-- service-role (via Edge Function resolve-tenant-by-hostname) pour brander
-- la page de login + le hub AVANT l'authentification.
--
-- Vérification de propriété : un token aléatoire doit être publié dans un
-- enregistrement TXT _gestu-verify.<hostname> avant que is_verified = true.
-- L'Edge Function dns-verify-tenant interroge le DNS et met à jour ce flag.

CREATE TABLE public.cabinet_domains (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hostname            text NOT NULL UNIQUE CHECK (
    length(hostname) BETWEEN 4 AND 253
    AND hostname = lower(hostname)
    AND hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  is_verified         boolean NOT NULL DEFAULT false,
  ssl_status          text NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'issued', 'error')),
  verification_token  text NOT NULL CHECK (length(verification_token) >= 24),
  verified_at         timestamptz,
  last_checked_at     timestamptz,
  last_error          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.cabinet_domains IS 'Hostnames custom (CNAME) qui résolvent vers un cabinet. Lus par Vercel middleware via resolve-tenant-by-hostname en service-role. Vérification DNS via dns-verify-tenant.';
COMMENT ON COLUMN public.cabinet_domains.verification_token IS 'Token aléatoire à publier dans un enregistrement DNS TXT _gestu-verify.<hostname> pour prouver la possession du domaine avant activation.';
COMMENT ON COLUMN public.cabinet_domains.ssl_status IS 'Statut du certificat SSL côté Vercel : pending (initial), issued (OK), error (échec émission).';

CREATE INDEX idx_cabinet_domains_cabinet ON public.cabinet_domains(cabinet_id);
CREATE INDEX idx_cabinet_domains_verified ON public.cabinet_domains(hostname) WHERE is_verified = true;

ALTER TABLE public.cabinet_domains ENABLE ROW LEVEL SECURITY;

-- Lecture authentifiée : son propre cabinet OU platform owner.
-- Pas de policy publique : la résolution pré-auth se fait service-role.
CREATE POLICY "cd_read_own_or_admin"
  ON public.cabinet_domains FOR SELECT
  TO authenticated
  USING (
    cabinet_id = public.get_my_organization_id()
    OR public.is_platform_owner()
  );

-- Aucune policy INSERT/UPDATE/DELETE : toutes les écritures passent par les
-- Edge Functions admin-cabinet-domain et dns-verify-tenant (service-role + audit log).
