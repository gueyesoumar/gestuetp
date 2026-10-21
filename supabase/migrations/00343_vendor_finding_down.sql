-- 00343 (DOWN)
drop function if exists public.get_vendor_findings(uuid);
drop function if exists public.delete_vendor_finding(uuid);
drop function if exists public.add_vendor_finding(uuid, text, text, uuid, text, text, text);
drop table if exists public.vendor_finding;
