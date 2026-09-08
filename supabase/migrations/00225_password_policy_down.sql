-- Migration 00225 (DOWN) — retrait de la politique de mot de passe.

drop policy if exists "pwpolicy_update" on public.platform_password_policy;
drop policy if exists "pwpolicy_select" on public.platform_password_policy;
drop table if exists public.platform_password_policy;

alter table public.users drop column if exists password_changed_at;
