-- Migration 00059: Table audit_campaigns + campaign_id sur missions (UP)
-- Description: Permet aux groupes de lancer des campagnes d'audit couvrant
-- plusieurs entités sur un référentiel donné, avec suivi de la progression.

-- 1. Type enum pour le statut des campagnes
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'completed');

-- 2. Table audit_campaigns
CREATE TABLE public.audit_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  framework_id uuid NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  name text NOT NULL,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_org ON public.audit_campaigns(organization_id);
CREATE INDEX idx_campaigns_framework ON public.audit_campaigns(framework_id);

-- 3. Colonne campaign_id sur missions (nullable, pas d'impact sur l'existant)
ALTER TABLE public.missions
  ADD COLUMN campaign_id uuid REFERENCES public.audit_campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_missions_campaign ON public.missions(campaign_id) WHERE campaign_id IS NOT NULL;

-- 4. RLS sur audit_campaigns
ALTER TABLE public.audit_campaigns ENABLE ROW LEVEL SECURITY;

-- SELECT : le groupe propriétaire voit ses campagnes
CREATE POLICY "campaigns_select_owner"
  ON public.audit_campaigns FOR SELECT
  TO authenticated
  USING (organization_id = public.get_my_organization_id());

-- SELECT : les filiales du groupe voient aussi les campagnes (pour contexte)
CREATE POLICY "campaigns_select_subsidiary"
  ON public.audit_campaigns FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT parent_org_id FROM public.organizations
      WHERE id = public.get_my_organization_id()
        AND parent_org_id IS NOT NULL
    )
  );

-- INSERT : seul le groupe propriétaire crée des campagnes
CREATE POLICY "campaigns_insert_owner"
  ON public.audit_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_my_organization_id());

-- UPDATE : seul le groupe propriétaire modifie ses campagnes
CREATE POLICY "campaigns_update_owner"
  ON public.audit_campaigns FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());

-- DELETE : seul le groupe propriétaire supprime ses campagnes
CREATE POLICY "campaigns_delete_owner"
  ON public.audit_campaigns FOR DELETE
  TO authenticated
  USING (organization_id = public.get_my_organization_id());
