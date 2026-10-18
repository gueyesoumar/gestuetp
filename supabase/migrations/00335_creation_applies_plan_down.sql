-- 00335 (DOWN) - restaure le trigger de provisioning « comply » et retire les helpers.
drop function if exists public.get_plan_contents(text);
drop trigger if exists trg_sync_org_capabilities on public.organizations;
create trigger trg_sync_org_capabilities
  after insert on public.organizations
  for each row execute function public.sync_org_capabilities();
drop function if exists public.provision_org_baseline(uuid);
