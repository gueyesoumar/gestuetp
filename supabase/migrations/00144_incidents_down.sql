-- 00144 — Gëstu Regul (M5) incidents (DOWN)
drop policy if exists "inc_select_assujetti" on public.incidents;
drop policy if exists "inc_select_regulator" on public.incidents;
drop policy if exists "inr_select_staff" on public.incident_notification_rules;
drop table if exists public.incidents cascade;
drop table if exists public.incident_notification_rules cascade;
