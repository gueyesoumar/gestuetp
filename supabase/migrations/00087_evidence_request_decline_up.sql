-- Migration 00087: Déclaration de document non disponible — UP
--
-- Permet au client de déclarer qu'il n'a pas un document demandé, plutôt que
-- de laisser la demande en silencieux. L'auditeur tranche ensuite (accepter,
-- réémettre, transformer en constat).
--
-- Étend la machine à états sur mission_evidence_requests.status :
--
--   pending             (existant — auditeur a demandé)
--   uploaded            (existant — au moins un document linké)
--   declined_by_client    NOUVEAU
--   accepted              NOUVEAU (auditeur valide la déclaration, sort du périmètre)
--   reissued              NOUVEAU (auditeur insiste — reset à pending avec commentaire)
--   escalated_to_finding  NOUVEAU (transformé en constat)
--
-- Retire 'validated' et 'rejected' du modèle (jamais utilisés depuis 5 ans).
-- Si un environnement avait ces valeurs, on les normalise vers 'pending'
-- avant de poser la check constraint.

-- ============================================================
-- 1. Normaliser les éventuelles valeurs validated/rejected
-- ============================================================
UPDATE public.mission_evidence_requests
SET status = 'pending'
WHERE status IN ('validated', 'rejected');

-- ============================================================
-- 2. Ajouter les colonnes liées à la déclaration et la décision
-- ============================================================
ALTER TABLE public.mission_evidence_requests
  ADD COLUMN decline_reason text
    CHECK (decline_reason IS NULL OR decline_reason IN ('inexistant', 'non_applicable', 'confidentialite')),
  ADD COLUMN decline_justification text,
  ADD COLUMN declined_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN declined_at timestamptz,
  ADD COLUMN auditor_response text,
  ADD COLUMN auditor_decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN auditor_decided_at timestamptz,
  ADD COLUMN escalated_assessment_id uuid REFERENCES public.control_assessments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.mission_evidence_requests.decline_reason IS
  'Motif de la déclaration client : inexistant | non_applicable | confidentialite';
COMMENT ON COLUMN public.mission_evidence_requests.decline_justification IS
  'Précisions libres du client. Mandatory si decline_reason ∈ {non_applicable, confidentialite}.';
COMMENT ON COLUMN public.mission_evidence_requests.escalated_assessment_id IS
  'Assessment auto-créé quand l''auditeur transforme la déclaration en constat (escalated_to_finding).';

-- ============================================================
-- 3. Poser la check constraint sur status (n'existait pas)
-- ============================================================
ALTER TABLE public.mission_evidence_requests
  ADD CONSTRAINT chk_mer_status
  CHECK (status IN (
    'pending',
    'uploaded',
    'declined_by_client',
    'accepted',
    'reissued',
    'escalated_to_finding'
  ));

COMMENT ON COLUMN public.mission_evidence_requests.status IS
  'pending | uploaded | declined_by_client | accepted | reissued | escalated_to_finding';

-- ============================================================
-- 4. Index pour les filtres status (couvre KPI auditeur + reminders)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mer_status
  ON public.mission_evidence_requests(mission_id, status);

-- ============================================================
-- 5. RLS — UPDATE pour le client (déclarer / annuler)
-- ============================================================
-- Permission : contributor + approver du portail client.
-- Le client ne peut écrire QUE les colonnes decline_*.
-- (Postgres n'a pas de column-level RLS standard ; on garde un check large
--  + l'edge function decline-evidence-request enforcer la bonne sémantique.)

DROP POLICY IF EXISTS "mer_update_client_decline" ON public.mission_evidence_requests;
CREATE POLICY "mer_update_client_decline"
  ON public.mission_evidence_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_client_role()
    AND mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission IN ('contributor', 'approver')
    )
  )
  WITH CHECK (
    public.is_client_role()
    AND mission_id IN (
      SELECT cma.mission_id FROM public.client_mission_access cma
      JOIN public.client_portal_contacts cpc ON cpc.id = cma.contact_id
      WHERE cpc.user_id = public.get_my_user_id()
        AND cma.permission IN ('contributor', 'approver')
    )
  );

-- ============================================================
-- 6. RLS — UPDATE pour l'auditeur (accepter / réémettre / escalader)
-- ============================================================
DROP POLICY IF EXISTS "mer_update_auditor_decision" ON public.mission_evidence_requests;
CREATE POLICY "mer_update_auditor_decision"
  ON public.mission_evidence_requests FOR UPDATE
  TO authenticated
  USING (mission_id IN (SELECT public.get_my_mission_ids()))
  WITH CHECK (mission_id IN (SELECT public.get_my_mission_ids()));
