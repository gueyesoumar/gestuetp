-- 00181 — DOWN : retire les moteurs de mission (workflow_version).

drop trigger if exists trg_mission_snapshot_engine on public.missions;
drop function if exists public.mission_snapshot_workflow_version();

alter table public.missions drop column if exists workflow_version;
alter table public.organizations drop column if exists workflow_version;
