-- Migration 00075: Soft-delete + flag IA (DOWN)

DROP INDEX IF EXISTS idx_controls_active;
DROP INDEX IF EXISTS idx_domains_active;
ALTER TABLE public.frameworks DROP COLUMN IF EXISTS was_ai_generated;
ALTER TABLE public.controls DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.domains DROP COLUMN IF EXISTS is_active;
