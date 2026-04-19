-- Migration: interview_schedules (DOWN)

drop table if exists public.interview_schedules cascade;
drop type if exists public.interview_status;
