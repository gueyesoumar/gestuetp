-- Cleanup démo : retire toutes les données du seed 099_demo_group_subsidiaries
-- =============================================================================
-- Tous les rows démo ont un id préfixé '00000000-0000-0000-0099-'.
-- L'ordre de suppression respecte les FK (assessments → mission_members
-- → missions → campagne → users → identities → auth → filiales).

BEGIN;

-- 1. Assessments (FK mission_id)
DELETE FROM public.control_assessments
WHERE mission_id IN (
  SELECT id FROM public.missions WHERE id::text LIKE '00000000-0000-0000-0099-200%'
);

-- 2. mission_members (FK mission_id)
DELETE FROM public.mission_members
WHERE mission_id IN (
  SELECT id FROM public.missions WHERE id::text LIKE '00000000-0000-0000-0099-200%'
);

-- 3. Missions
DELETE FROM public.missions WHERE id::text LIKE '00000000-0000-0000-0099-200%';

-- 4. Campagne
DELETE FROM public.audit_campaigns WHERE id::text LIKE '00000000-0000-0000-0099-300%';

-- 5. Users RSSI (public.users d'abord pour casser la FK organization_id)
DELETE FROM public.users WHERE id::text LIKE '00000000-0000-0000-0099-100%';

-- 6. Auth identities + auth users
DELETE FROM auth.identities WHERE user_id::text LIKE '00000000-0000-0000-0099-100%';
DELETE FROM auth.users      WHERE id::text       LIKE '00000000-0000-0000-0099-100%';

-- 7. Filiales (en dernier : la FK parent_org_id pointe vers Gëstu Advisory, pas l'inverse)
DELETE FROM public.organizations WHERE id::text LIKE '00000000-0000-0000-0099-000%';

COMMIT;
