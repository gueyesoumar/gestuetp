-- Rollback n°18 Lot 3a.
drop index if exists public.idx_missions_review_of;
alter table public.control_assessments drop column if exists review_delta;
alter table public.missions drop column if exists review_of_mission_id;
