-- Migration: reports (DOWN)

drop policy if exists "reports_select_team" on public.reports;
drop policy if exists "reports_select_client" on public.reports;
drop table if exists public.reports cascade;
drop type if exists public.report_status;
drop type if exists public.report_format;
