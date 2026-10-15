-- Rollback 00316.
drop function if exists public.get_supervisor_directives();
drop function if exists public.verify_risk_treatment(uuid, text);
drop function if exists public.request_risk_treatment(uuid, text, uuid, date);
drop function if exists public.can_supervise_org(uuid);
