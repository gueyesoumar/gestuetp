-- Migration 00069: Plans tarifaires + plan_id sur organizations (UP)
-- Description: Référentiel statique des plans pour le calcul placeholder du MRR
-- (Σ cabinets actifs × tarif). Pas d'intégration paiement — Stripe en Phase 2.

CREATE TABLE public.plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  name                text NOT NULL,
  description         text,
  monthly_price_eur   numeric(10, 2) NOT NULL DEFAULT 0,
  is_default          boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plans IS 'Plans tarifaires Gëstu. monthly_price_eur sert au calcul placeholder du MRR.';

CREATE UNIQUE INDEX idx_plans_default ON public.plans(is_default) WHERE is_default = true;

-- Lecture publique authentifiée (chaque utilisateur peut voir les plans)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_select_all" ON public.plans FOR SELECT TO authenticated USING (true);

-- Seed des 3 plans
INSERT INTO public.plans (slug, name, description, monthly_price_eur, is_default) VALUES
  ('decouverte', 'Découverte', 'Cabinet en démo · 1 mission active · 3 utilisateurs', 0, true),
  ('pro',        'Pro',        'Cabinet payant · missions illimitées · 20 utilisateurs', 800, false),
  ('regulateur', 'Régulateur', 'État / Régulateur · supervision multi-entités · sur devis', 0, false);

-- Liaison organisations → plan
ALTER TABLE public.organizations
  ADD COLUMN plan_id uuid REFERENCES public.plans(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.organizations.plan_id IS 'Plan tarifaire de l''organisation. NULL = non assigné (à régler manuellement).';

-- Backfill : tous les cabinets existants passent au plan par défaut
UPDATE public.organizations
SET plan_id = (SELECT id FROM public.plans WHERE is_default = true LIMIT 1)
WHERE 'cabinet' = ANY(types) AND plan_id IS NULL;

CREATE INDEX idx_organizations_plan ON public.organizations(plan_id);
