-- Migration: control_assessments (DOWN)

drop trigger if exists trg_control_assessments_updated_at on public.control_assessments;
drop policy if exists "ca_select_auditor" on public.control_assessments;
drop policy if exists "ca_update_auditor" on public.control_assessments;
drop policy if exists "ca_select_lead_associate" on public.control_assessments;
drop policy if exists "ca_select_client" on public.control_assessments;
drop table if exists public.control_assessments cascade;
drop type if exists public.assessment_status;
