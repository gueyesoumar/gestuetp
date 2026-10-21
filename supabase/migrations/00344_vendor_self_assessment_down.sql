-- 00344 (DOWN)
drop function if exists public.submit_vendor_self_assessment(uuid);
drop function if exists public.set_vendor_self_evaluation(uuid, uuid, text, text);
drop function if exists public.get_my_vendor_self_assessment_detail(uuid);
drop function if exists public.get_my_vendor_self_assessments();
drop function if exists public._vendor_portal_guard(uuid);
drop function if exists public.request_vendor_self_assessment(uuid);
alter table public.vendor_assessment drop constraint if exists vendor_assessment_status_check;
alter table public.vendor_assessment add constraint vendor_assessment_status_check
  check (status in ('en_cours', 'cloturee'));
