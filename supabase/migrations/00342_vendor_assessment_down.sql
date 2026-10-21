-- 00342 (DOWN)
drop function if exists public.close_vendor_assessment(uuid, int);
drop function if exists public.get_vendor_assessment_detail(uuid);
drop function if exists public.get_vendor_assessments(uuid);
drop function if exists public.set_vendor_evaluation(uuid, uuid, text, text);
drop function if exists public.create_vendor_assessment(uuid, uuid);
drop function if exists public.compute_vendor_assessment_score(uuid);
drop function if exists public._vendor_assessment_guard(uuid);
drop table if exists public.vendor_control_evaluation;
drop table if exists public.vendor_assessment;
