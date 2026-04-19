-- Migration: notifications (DOWN)

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop table if exists public.notifications cascade;
