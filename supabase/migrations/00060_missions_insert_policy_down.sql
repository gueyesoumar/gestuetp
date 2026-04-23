-- Migration 00060: Policies INSERT et UPDATE sur missions (DOWN)
DROP POLICY IF EXISTS "missions_insert_cabinet" ON public.missions;
DROP POLICY IF EXISTS "missions_update_cabinet" ON public.missions;
