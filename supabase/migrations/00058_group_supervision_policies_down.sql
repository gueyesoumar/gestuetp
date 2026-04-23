-- Migration 00058: Policies RLS pour la supervision groupe (DOWN)
DROP POLICY IF EXISTS "missions_select_group" ON public.missions;
DROP POLICY IF EXISTS "ca_select_group" ON public.control_assessments;
DROP POLICY IF EXISTS "car_select_group" ON public.corrective_action_requests;
