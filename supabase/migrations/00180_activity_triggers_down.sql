-- 00180 — DOWN : retire les triggers de journalisation et la fonction générique.

drop trigger if exists trg_activity_car on public.corrective_action_requests;
drop trigger if exists trg_activity_cabinet_clients on public.cabinet_clients;
drop trigger if exists trg_activity_missions on public.missions;
drop trigger if exists trg_activity_platform_roles on public.platform_roles;
drop trigger if exists trg_activity_organizations on public.organizations;

drop function if exists public.log_activity_change();
