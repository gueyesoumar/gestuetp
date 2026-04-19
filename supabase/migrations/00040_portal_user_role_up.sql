-- Migration: portal_user_role (UP)
-- Description: Ajoute le rôle utilisateur (auditor/client) et le lien client_org_id sur la table users

ALTER TABLE public.users
  ADD COLUMN role text NOT NULL DEFAULT 'auditor',
  ADD COLUMN client_org_id uuid REFERENCES public.cabinet_clients(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD CONSTRAINT chk_users_role CHECK (role IN ('auditor', 'client'));

COMMENT ON COLUMN public.users.role IS 'Rôle principal : auditor (cabinet) ou client (audité)';
COMMENT ON COLUMN public.users.client_org_id IS 'Référence cabinet_clients pour les utilisateurs client (NULL pour les auditeurs)';

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_client_org ON public.users(client_org_id) WHERE client_org_id IS NOT NULL;

-- Les clients voient leur propre profil via "users_select_self" (auth_id = auth.uid())
-- Pas de policy cross-org sur users pour éviter la récursion RLS
