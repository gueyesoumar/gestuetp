-- Migration 00235 (DOWN)

DROP INDEX IF EXISTS public.idx_missions_demo_owner;
DROP INDEX IF EXISTS public.idx_cabinet_clients_demo_owner;

ALTER TABLE public.missions
  DROP COLUMN IF EXISTS is_demo,
  DROP COLUMN IF EXISTS demo_owner_id;

ALTER TABLE public.cabinet_clients
  DROP COLUMN IF EXISTS is_demo,
  DROP COLUMN IF EXISTS demo_owner_id;
