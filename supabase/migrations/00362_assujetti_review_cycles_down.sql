-- Rollback n°18 Lot 1.
drop function if exists public.roll_assujetti_review(uuid, uuid, uuid, timestamptz);
drop table if exists public.assujetti_review_cycles;
